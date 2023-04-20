const puppeteer = require('puppeteer');
const {logger, addLogRotate} = require('./logging')

class GoogleMapsScraper {
    constructor() {
        this.browser = null;
        this.__page = null;
        this.__termo_busca = null;
    }

    async initialize(iseadLess) {
        this.browser = await puppeteer.launch({headless: iseadLess});
        this.__page = await this.browser.newPage();
    }

    set termo_busca(termo) {
        this.__termo_busca = termo
    }

    get termo_busca() {
        return this.__termo_busca
    }

    get page() {
        return this.__page
    }

    getCurrentTimestamp() {
        const currentDate = new Date();
        return currentDate.getTime();
        ;
    }

    getDateAtual() {
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear().toString();
        return `${day}_${month}_${year}`;
    }

    salvarDadosCSV(array, name='contatos') {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: `workspace/contatos/${this.getDateAtual()}_${this.getCurrentTimestamp()}_${name}.csv`,
            header: [
                {id: 'domain', title: 'Dominio'},
                {id: 'titular', title: 'Titular'},
                {id: 'documento', title: 'CNPJ'},
                {id: 'responsável', title: 'Responsável'},
                {id: 'nome', title: 'Nome'},
                {id: 'email', title: 'Email'},
                {id: 'name_company', title: 'Nome Empresa'},
                {id: 'website', title: 'Website'},
                {id: 'telefone', title: 'Telefone'},
            ]
        });

        csvWriter.writeRecords(array)
            .then(() => {
                logger.info('Dados gravados com sucesso!');
            });

    }

    async getInfoRegistroBr(url) {
        logger.warn('Acessando registro.br' + url)
        await this.page.goto(`https://registro.br/tecnologia/ferramentas/whois?search=${url}`)
        await this.page.waitForSelector('#whois-field')
        await this.page.waitForTimeout(1000)

        const info = await this.page.evaluate(() => {
            let obj = {}
            let objCompleto = {}
            document.querySelectorAll('tr').forEach((row) => {
                const th = row.querySelector('th');
                const td = row.querySelector('td');
                if (th && td) {
                    let columns = ['titular', 'documento', 'responsável', 'nome', 'email']
                    const key = th.innerText.trim().toLowerCase().replaceAll(' ', '_');
                    const value = td.innerText.trim();
                    objCompleto[key] = value
                    if (columns.includes(key)) {
                        obj[key] = value;
                    }
                }
            });
            return {
                obj,
                objCompleto
            }
        })
        return info.obj
    }

    isValidUrl(url_website) {
        const url = new URL(url_website);
        const domain = url.hostname;
        const hasBr = /\.br$/.test(domain);

        if (hasBr) {
            return true
        } else {
            return false
        }

    }


    async getContatosListMap(termo_pesquisa) {
        this.termo_busca = termo_pesquisa
        this.page.goto('https://www.google.com/maps')
        await this.page.waitForNavigation({waitUntil: 'networkidle2', timeout: 40000})
        await this.page.click('#searchboxinput')
        logger.info('Pesquisando por: ' + termo_pesquisa)
        await this.page.keyboard.type(termo_pesquisa, {delay: 50})
        await this.page.keyboard.press('Enter')

        await this.page.waitForNavigation({waitUntil: 'networkidle2'})
        await this.page.waitForTimeout(3000)

        let previousHeight;
        while (true) {
            await this.page.waitForTimeout(3000);
            const currentHeight = await this.page.evaluate(() => {
                const modal = document.querySelector('#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd');
                previousHeight = modal.scrollHeight;
                modal.scrollTop = previousHeight;
                return previousHeight;
            });


            await this.page.waitForTimeout(1000);
            logger.info('Fazendo rolagem...')
            if (currentHeight === previousHeight) {
                break;
            }
            await this.page.evaluate(() => {
                const followersModal = document.querySelector('#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd');
                followersModal.scrollTo(0, previousHeight);
            });
            previousHeight = currentHeight;
        }

        logger.info('Rolagem finalizada!')

        const AllList = await this.page.evaluate(async () => {
            let arr = []

            document.querySelectorAll('.Nv2PK.tH5CWc.THOPZb ')
                .forEach((item) => {
                    let arrayInfo = item.innerText.split('\n')
                    let obj = {
                        name_company: arrayInfo[0],
                        endereco: arrayInfo[2],
                        horario: arrayInfo[3],
                    }
                    const telefoneRegex = /\((\d{2})\)\s*(\d{4,5})-(\d{4})/;
                    const telefone = obj.horario.match(telefoneRegex);

                    // Obter o link presente no atributo data-value da tag a
                    obj.website = item.querySelector('a[data-value="Website"]').getAttribute('href');

                    if (telefone) {
                        const numero = `${telefone[1]} ${telefone[2]}-${telefone[3]}`;
                        delete obj.horario;
                        obj.telefone = numero;
                    }
                    arr.push(obj)
                })
            return arr
        });
        AllList.forEach((item) => {
            logger.info(`item: ${JSON.stringify(item)}`)
        })
        return AllList
    }

    extrairDomain(url) {
        const domainRegex = /(?<=\/\/)([^\/\s]+)/;
        const match = domainRegex.exec(url);

        if (match) {
            const domain = match[1];
            return domain;
        }
    }

    addHttpsIfNeeded(url) {
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }
        return url;
    }


    async close() {
        await this.browser.close();
    }
}


const scraper = new GoogleMapsScraper();

(async () => {
    const termo_busca = 'contabilidade perto de São José dos Campos, SP'
    addLogRotate('./workspace')
    await scraper.initialize(false);
    const contatos = await scraper.getContatosListMap(termo_busca)
    scraper.salvarDadosCSV(contatos, 'contatos_google_maps')
    var contatos_filtrado = []
    try {
        for (const item of contatos) {
            const urkFind = scraper.addHttpsIfNeeded(item.website)
            const url = new URL(urkFind);
            const domain = url.hostname;
            if (scraper.isValidUrl(urkFind)) {
                await scraper.page.waitForTimeout(1000)
                logger.info(`Iniciando a extrarção no Registro.br: ${domain}`)
                const info = await scraper.getInfoRegistroBr(domain)
                logger.info(`info: ${JSON.stringify(info)}`)
                if(info !== undefined) {
                    contatos_filtrado.push({...JSON.parse(JSON.stringify(info)), ...item, domain})
                }
            }
        }

        scraper.salvarDadosCSV(contatos_filtrado, 'contatos_registro_br')
        await scraper.close();
    } catch (e) {
        logger.error(`Erro ao obter info do registro.br: ${e}`)
        await scraper.close();
    }


})();
