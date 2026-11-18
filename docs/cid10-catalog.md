# Catálogo CID-10 do Conquistar

## Classificação adotada

O sistema utiliza a **CID-10, versão eletrônica DATASUS V2008**, em português do Brasil. A fonte primária é o pacote `CID10CSV.zip`, publicado pelo DATASUS/CBCD:

- página oficial: `https://www2.datasus.gov.br/cid10/V2008/download.htm`;
- pacote oficial: `http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip`;
- arquivos importados: `CID-10-CATEGORIAS.CSV` e `CID-10-SUBCATEGORIAS.CSV`.

O catálogo reúne categorias e subcategorias oficiais, remove somente as duplicidades hierárquicas e preserva 14.233 códigos pesquisáveis — inclusive categorias como `J45` e detalhamentos como `J45.0`. O registro `cid_catalog_releases` mantém versão, fonte e SHA-256 combinado dos arquivos para rastreabilidade.

## Atualização segura

1. Baixe o pacote diretamente da fonte oficial.
2. Extraia `CID-10-CATEGORIAS.CSV` e `CID-10-SUBCATEGORIAS.CSV` sem alterar sua codificação original.
3. Preserve a versão anterior: atendimentos já vinculados devem continuar apontando para a edição usada no momento do registro.
4. Execute `node scripts/import-cid10.mjs <arquivo.csv> <migração.sql>` para validar cabeçalho, unicidade, volume mínimo e gerar o seed SQL.
5. Revise a contagem, a versão e o SHA-256 exibidos pelo importador antes de incluir a migração.
6. Teste buscas por código, descrição com e sem acento e vínculos históricos antes de publicar.

O importador recusa arquivos reduzidos com menos de 14 mil códigos. Uma atualização futura deve receber um novo `release_id` e uma nova versão, sem substituir os registros utilizados por atendimentos antigos.

## Busca e desempenho

Os códigos são buscados por um índice de prefixo normalizado. As descrições usam FTS5 com remoção de diacríticos, limite de resultados e busca sob demanda. O navegador nunca recebe o catálogo completo; o autocomplete consulta apenas os resultados necessários.
