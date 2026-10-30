# Aniquilação

**Aniquilação** é um aplicativo companion para uma campanha de RPG de mesa de ficção científica e bio-horror. Desenvolvido como projeto pessoal, ele amplia a experiência da mesa com fichas interativas, registros de personagens, documentos, inventários e eventos narrativos controlados pelo Mestre.

A proposta é fazer do aplicativo parte da ambientação: um terminal da **Valtesia Research** que revela informações aos poucos, acompanha as decisões do grupo e permite que acontecimentos da campanha afetem as interfaces dos jogadores em tempo real.

> Projeto independente, sem finalidade comercial, criado por diversão, aprendizado e experimentação.

## Funcionalidades

### Para os jogadores

- **Fichas de personagem:** atributos, estados, recursos, vida, inventário e outras informações editáveis, com sincronização pelo Firestore.
- **Skill Cards:** cartas de habilidade organizadas por tiers, com seleção, ativação, efeitos e recargas.
- **Inventário compartilhável:** gerenciamento de itens e transferência para outros personagens.
- **Documentos:** acesso progressivo a registros da campanha, com visualização e compartilhamento entre jogadores.
- **NPCs:** descoberta de personagens e liberação gradual de nome, status, relação e outras informações.
- **Galerias de NPCs:** imagens reveladas individualmente pelo Mestre, apresentadas em um painel visual com miniaturas de proporções variadas.
- **Compartilhamento de informações:** envio de informações descobertas sobre NPCs a outros personagens.
- **Anotações e registros:** observações dos jogadores e histórico de decisões importantes.

### Para o Mestre

- **Painel de controle:** gerenciamento de personagens ativos, bloqueio de sessão, pendências e monitoramento de habilidades.
- **Liberações individuais ou em grupo:** controle de Skill Cards, NPCs, informações, imagens de galerias, documentos e eventos de classe.
- **Eventos em tempo real:** alerta da instalação, contagem de autodestruição e temporizador personalizado com nome e duração definidos pelo Mestre.
- **Temporizadores flutuantes:** visores sincronizados e arrastáveis, pensados para permanecer acessíveis durante a navegação.
- **Áudio narrativo:** Number Stations, checagens de rádio, transmissões de alto-falante, eventos de instinto e efeitos sonoros de ataques.
- **Recursos de narrativa:** notificações contextuais, registros de escolhas e controle de eventos da campanha.
- **Ferramentas de teste:** restauração individual de personagens e reset geral do progresso.

As alterações de dados e os eventos compartilhados utilizam o **Cloud Firestore**. Já os efeitos sonoros são reproduzidos **localmente no dispositivo do Mestre**, usando a saída de áudio configurada no sistema.

## Tecnologias

- **React Native** — interface do aplicativo.
- **Expo** e **Expo Router** — desenvolvimento, execução e navegação.
- **TypeScript** — tipagem e organização do código.
- **Firebase / Cloud Firestore** — persistência e sincronização em tempo real.
- **React Native Reanimated** — animações e interações da interface.
- **React Native Paper** — componentes de interface.
- **Expo Audio** — reprodução dos efeitos e das transmissões.
- **AsyncStorage** — persistência de preferências e dados locais.

## Executando localmente

Com Node.js e as dependências do ambiente Expo instalados, abra o projeto e execute:

```bash
npm install
npx expo start
```

O aplicativo depende de uma configuração válida do **Firebase**, das permissões correspondentes no **Firestore** e dos arquivos de mídia utilizados na campanha. Esses recursos precisam estar presentes ou configurados para que todas as funcionalidades operem corretamente.

O projeto é voltado principalmente à experiência em **Android**, com recursos também utilizados e testados durante o desenvolvimento na **Web**. O comportamento pode variar entre plataformas.

Além disso, algumas funções, como a vibração podem estar disponível apenas para builds .apk, disponibilizadas nos arquivos do projeto.

## Acesso ao Painel do Mestre

Para evitar spoilers e alterações indevidas durante a campanha, a senha de acesso ao **Painel do Mestre (Game Master)** não será disponibilizada publicamente por enquanto.

Após o encerramento da campanha de **Aniquilação**, as credenciais serão substituídas, o sistema de autenticação e as regras de segurança do Firebase/Firestore serão revisados e um ambiente de demonstração independente será disponibilizado.

Assim, qualquer pessoa poderá explorar **todas as funcionalidades do aplicativo**, incluindo as ferramentas exclusivas do Mestre, sem comprometer os dados originais da campanha.

## Identidade visual

A interface parte da identidade fictícia da **Valtesia Research**, com visual de terminal corporativo, tons escuros, indicadores de acesso e alertas de contenção. Elementos translúcidos, holográficos e animações reforçam a atmosfera de ficção científica e terror psicológico.

## Objetivo e desenvolvimento

Este projeto serve como espaço para:

- Aprender e experimentar com React Native, Expo e TypeScript.
- Explorar persistência, permissões e sincronização de dados em tempo real.
- Desenvolver componentes interativos e experiências adaptadas a diferentes telas.
- Integrar recursos técnicos a mecânicas narrativas de RPG.
- Testar soluções, revisar decisões de arquitetura e evoluir o aplicativo conforme as sessões acontecem.

**Aniquilação** está em desenvolvimento contínuo e foi criado especificamente para uma campanha particular. Funcionalidades, estrutura e recursos podem mudar conforme as necessidades da mesa.

---

*Feito por diversão, aprendizado e curiosidade — e para transformar um RPG de mesa em uma experiência um pouco mais imersiva.*
