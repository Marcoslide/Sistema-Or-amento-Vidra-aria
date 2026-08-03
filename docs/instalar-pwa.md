# Instalar o VidroGestor como aplicativo (PWA)

O VidroGestor é um PWA: pode ser instalado como app no celular e no computador,
abrindo em tela cheia, sem barra do navegador. Requer HTTPS (o Preview/Homologação
já é servido em HTTPS).

## Android (Chrome)
1. Abra o endereço do sistema no Chrome.
2. Toque no menu **⋮** (canto superior direito).
3. Toque em **Instalar aplicativo** (ou **Adicionar à tela inicial**).
4. Confirme. O ícone do VidroGestor aparece na tela inicial.

## Desktop (Chrome / Edge)
1. Abra o sistema no navegador.
2. Na barra de endereço, clique no ícone de **instalar** (monitor com seta) à direita.
   - Se não aparecer: menu **⋮ → Instalar VidroGestor…**.
3. Confirme. O app abre em janela própria e fica disponível no menu Iniciar / Launchpad.

## iPhone / iPad (Safari)
O iOS não mostra botão automático — a instalação é manual pelo Safari:
1. Abra o sistema no **Safari** (não funciona pelo Chrome no iOS).
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Role e toque em **Adicionar à Tela de Início**.
4. Ajuste o nome se quiser e toque em **Adicionar**.

## Observações
- Após instalar, atualizações do sistema são aplicadas automaticamente ao reabrir
  (o service worker busca a nova versão).
- Para sair da conta, use o menu do usuário no topo direito → **Sair**.
- Offline: o app abre a casca (shell) mesmo sem internet, mas as telas com dados
  precisam de conexão com o Supabase para carregar/salvar.
