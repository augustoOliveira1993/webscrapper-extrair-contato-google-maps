# Automação de Extração de Contatos do Google Maps

Esta automação tem como propósito extrair contatos do Google Maps com base em um termo de busca especificado pelo usuário.

## Dependências
Para executar a automação, é necessário ter as seguintes dependências instaladas:

- Node.js
- csv-writer
- puppeteer
- winston
- winston-daily-rotate-file

## Instruções para Executar a Automação
Para executar a automação, siga as instruções abaixo:

- Abra o terminal e navegue até a pasta do projeto;
- Execute o seguinte comando no terminal para instalar as dependências necessárias:
```
npm install
```
- Abra o arquivo <b>webscrapper.js</b> e altere a variável <b>termo_busca</b> para a busca desejada no Google Maps;
Execute o seguinte comando no terminal para iniciar a automação:
```
node webscrapper.js
```

## Funcionamento da Automação
A automação acessa o Google Maps, realiza uma busca pelo termo especificado na variável <b>termo_busca</b>, extrai os contatos encontrados e os armazena em um arquivo <b>DD_MM_YYYY_TIMESTAMP_contatos.csv</b>.

## Observações
Os contatos extraídos são armazenados em um arquivo CSV com as seguintes colunas:

- Nome da Empresa
- Endereço
- Telefone
- Website

Esse arquivo está localizado na pasta `workspace/contatos/` do projeto.
