# Guia Interativo de Ferramentas

Bem-vindo ao **Guia Interativo de Ferramentas**! Este é um aplicativo web Full-Stack para organizar, gerenciar e consultar um catálogo de ferramentas tecnológicas. Ideal para desenvolvedores, equipes de TI ou qualquer pessoa que precise manter um inventário acessível e interativo de softwares, frameworks, linguagens e outros recursos.

---

## ✨ Funcionalidades

- **Autenticação de Usuário:** Registro e login com senha criptografada (bcrypt) e autenticação via JWT.
- **Autorização por Papéis:**
    - `super_admin`: Acesso total ao CRUD de ferramentas.
    - `viewer`: Acesso somente leitura.
- **Gestão de Ferramentas (CRUD):**
    - Listagem, pesquisa e filtros.
    - Adição, edição e exclusão (restrito a super_admin).
- **Interface Responsiva:** Desenvolvida com Tailwind CSS para ótima experiência em qualquer dispositivo.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** & **Express.js**: API RESTful.
- **MySQL2**: Banco de dados relacional.
- **bcrypt**: Hash de senhas.
- **jsonwebtoken**: Autenticação JWT.
- **dotenv**: Variáveis de ambiente.
- **cors**: Middleware CORS.

### Frontend
- **HTML5** & **JavaScript (ES6+)**
- **Tailwind CSS**
- **Local Storage**: Armazenamento do JWT e dados do usuário.

---

## ⚙️ Como Rodar Localmente

### 1. Clone o Repositório

```bash
git clone https://github.com/AdolfoFigueiredo/MyFerrament-list-to-do.git
cd MyFerrament-list-to-do
```

### 2. Configure o Backend

- Instale as dependências:

    ```bash
    npm install
    ```

- Configure o banco de dados MySQL (local, Docker, XAMPP, etc.).
- O backend cria o banco e as tabelas automaticamente na primeira execução.
- Crie um arquivo `.env` na raiz do projeto:

    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_DATABASE=guia_ferramentas_db
    JWT_SECRET=sua_chave_secreta_muito_forte_e_aleatoria_aqui
    ```

- Inicie o servidor:

    ```bash
    node server.js
    ```

    O backend estará em `http://localhost:3000`.

### 3. Configure o Frontend

- Abra `auth.html` e `dashboard.html` no navegador.
- Certifique-se de que a constante `API_BASE_URL` nos arquivos JS aponte para `http://localhost:3000/api`.

---

## 🚀 Uso da Aplicação

### Autenticação

- Acesse `auth.html` para registrar ou fazer login.
- Usuários registrados via formulário são `viewer` por padrão.
- Para criar um `super_admin`, altere temporariamente no `server.js` a linha `const userRole = 'viewer';` para `const userRole = 'super_admin';`, registre o admin, e depois retorne para `viewer`.

### Dashboard

- Todos autenticados podem visualizar, pesquisar e filtrar ferramentas.
- Apenas `super_admin` pode adicionar, editar ou excluir ferramentas.

---

## ☁️ Deploy

- **Frontend:** Hospede gratuitamente no GitHub Pages, Vercel ou Netlify.
- **Backend:** Use Render.com, Railway.app ou VPS. Configure as variáveis do `.env` na plataforma escolhida.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Abra uma issue ou envie um pull request.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
