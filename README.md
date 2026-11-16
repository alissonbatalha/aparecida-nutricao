# Aparecida Nutrição

Painel de pacientes com cálculo automático de IMC e classificação OMS.

**Demo:** https://aparecida-nutricao-five.vercel.app

## Funcionalidades
- Cadastro de pacientes com validação (aceita vírgula decimal)
- Cálculo de IMC e classificação
- Filtro por nome em tempo real
- Remoção por botão (funciona em toque)
- Importação de pacientes via JSON local
- Layout responsivo

## Stack
HTML5, CSS3 e JavaScript (ES modules), sem dependências.

## Rodar local
```bash
npx serve .
```
`fetch` exige servidor HTTP, não funciona via `file://`.

## Estrutura
```
index.html
css/        estilos
js/app.js   lógica (IMC, validação, tabela, filtro)
data/       pacientes de exemplo
img/        logo
```

## Licença
MIT
