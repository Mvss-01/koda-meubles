Projet : KODA Meubles – Plateforme E-commerce

📝 Présentation du projet:
- KODA Meubles est une plateforme e-commerce (site vitrine et boutique en ligne) spécialisée dans la vente de mobilier haut de gamme. Pensée pour offrir une expérience utilisateur fluide, l'application allie design moderne, confort de navigation et accessibilité.
- Elle intègre l'ensemble des fonctionnalités essentielles d'un site e-commerce moderne : un catalogue dynamique filtrable par catégories, un panier d'achat interactif, un espace membre sécurisé (authentification et gestion de compte), ainsi qu'un tunnel de commande complet. L'architecture repose sur une gestion dynamique des données en temps réel, propulsée par Supabase.

🚀 Guide d'utilisation et Fonctionnalités:
1. Navigation et Découverte
- Accueil (index.html) : Vitrine du site mettant en avant l'univers KODA, les catégories phares et une sélection de produits tendance.
- Catalogue (content/products-list.html) : Interface de consultation de l'intégralité de la collection, avec navigation par catégories.
- À propos (content/about.html) : Présentation de l'histoire, des valeurs et des engagements de l'entreprise.
- Contact (content/contact.html) : Formulaire dédié à la relation client, permettant aux visiteurs de contacter directement l'équipe KODA pour toute demande d'information ou de support.

2. Parcours d'Achat
- Gestion du Panier : Ajout d'articles en toute simplicité depuis le catalogue. Le suivi et la mise à jour du panier sont gérés dynamiquement de manière transparente (via javascript/cart.js).
- Tunnel de commande (content/checkout.html) : Interface dédiée à la finalisation des achats et au paiement, une fois la sélection d'articles validée.

3. Espace Utilisateur
Authentification (content/login.html & content/signup.html) : Système de création de compte et de connexion permettant aux utilisateurs de gérer leurs informations. Les formulaires sont sécurisés par des contrôles de saisie stricts (expressions régulières) garantissant la fiabilité des données.

🛠 Architecture Technique:
- L'application est conçue selon une architecture modulaire pour faciliter la maintenance et l'évolution du code :
- Composants d'interface (UI) : Le menu de navigation et le pied de page (footer) sont modularisés et injectés dynamiquement sur toutes les pages via JavaScript (javascript/navbar.js et javascript/footer.js).
- Gestion des données (BaaS) : L'intégration de la base de données et de l'authentification est réalisée grâce au SDK Supabase. Les scripts javascript/supabase-init.js et javascript/load-data.js assurent la connexion et le chargement asynchrone des produits et catégories.
- Intégration Web (Styles) : L'ensemble des feuilles de style est centralisé dans le répertoire styles/ (ex. : style.css, navbar.css), garantissant une cohérence visuelle sur l'ensemble de l'application.

👥 Équipe du projet:
Ce projet a été conçu et développé par :
1) Mahdi Mayas
2) Lazri Ouzna
3) Tibiche Yasmine
4) Ammari Mouna
5) Touzouti Houda