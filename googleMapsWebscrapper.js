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
        return currentDate.getTime();;
    }

    getDateAtual() {
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear().toString();
        return `${day}_${month}_${year}`;
    }

    salvarDadosCSV(array) {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: `workspace/contatos/${this.getDateAtual()}_${this.getCurrentTimestamp()}_contatos.csv`,
            header: [
                {id: 'name_company', title: 'Nome da Empresa'},
                {id: 'endereco', title: 'Endereço'},
                {id: 'telefone', title: 'Telefone'},
                {id: 'website', title: 'Website'}
            ]
        });

        csvWriter.writeRecords(array)
            .then(() => {
                logger.info('Dados gravados com sucesso!');
            });

    }

    async getContatosListMap(termo_pesquisa) {
        this.termo_busca = termo_pesquisa
        this.page.goto('https://www.google.com/maps')
        await this.page.waitForNavigation({waitUntil: 'networkidle2'})
        await this.page.click('#searchboxinput')
        logger.info('Pesquisando por: ' + termo_pesquisa)
        await this.page.keyboard.type(termo_pesquisa, {delay: 50})
        await this.page.keyboard.press('Enter')

        await this.page.waitForNavigation({waitUntil: 'networkidle2'})
        await this.page.waitForTimeout(1000)

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
        this.salvarDadosCSV(AllList)
        return AllList
    }


    async close() {
        await this.browser.close();
    }
}


const scraper = new GoogleMapsScraper();

(async () => {
    const termo_busca = 'contabilidade perto de Açailândia, MA'
    addLogRotate('./workspace')
    await scraper.initialize(true);
    await scraper.getContatosListMap(termo_busca)
    await scraper.close();
})();
