Este é um esboço de README.md profissional para o seu projeto FORJA RPG, focado em organizar o controle de versão no GitHub, respeitando suas diretrizes de uso.

FORJA RPG - Escudo do Mestre O FORJA RPG é uma aplicação web de mesa virtual (VTT) projetada para oferecer uma experiência imersiva e performática para mestres de RPG. Com funcionalidades de controle de iluminação, Fog of War (FoW) e renderização via WebGL, o projeto prioriza a simplicidade de uso com alta profundidade técnica.

⚠️ Aviso de Uso Este código é de propriedade do autor e está disponível para fins de estudo, aprendizado e consulta de ideias. Não é permitida a replicação, distribuição ou uso comercial deste código para sistemas similares ou propósitos idênticos ao projeto original.

🛠️ Tecnologias Utilizadas Frontend: HTML5, CSS3 (com custom properties para temas), JavaScript.

Networking: PeerJS para comunicação P2P em tempo real.

Renderização: API Canvas (WebGL Lighting support).

Fontes: Inter e Orbitron (via Google Fonts).

🚀 Funcionalidades Principais Escudo do Mestre: Interface centralizada para gerenciamento de NPCs, mapas e recursos de jogo.

Iluminação WebGL: Controle dinâmico de intensidade e cor de fontes de luz no mapa.

Gerenciamento P2P: Funcionalidades de rede para conectar jogadores sem necessidade de um servidor central complexo.

Design Responsivo e Temático: Interface inspirada em ambientes de ficção científica, com uso de backdrop-filter e transições suaves.

Persistência de Dados: Uso de localStorage para salvar configurações de mapas e NPCs localmente.

📦 Estrutura do Projeto index.html: Arquivo principal contendo a estrutura, estilos (CSS inlined para performance) e lógica de interface.

PeerJS: Implementado via CDN para facilitar a conexão multiplayer.

📝 Como Colaborar (Estudo) Se você deseja utilizar este projeto para aprender:

Explore a Lógica: Analise como o canvas é manipulado e como a iluminação é aplicada.

Estude o PeerJS: Veja como a comunicação é broadcastada para os peers conectados.

Melhore o CSS: Entenda o uso de variáveis CSS para criar temas escuros e modernos.

Desenvolvido como parte do ecossistema FORJA RPG.
