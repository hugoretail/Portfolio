# Portfolio Hugo

## Démarrer

```bash
cd portfolio-hugo
npm install
npm run dev
```

## Notes

- Contexte initial (chat) : https://chat.mistral.ai/chat/5b21ceb2-0659-43da-99a9-2a4370fb9609

## TODO :

Fix l'affichage de l'animation sur la page informatique. Actuellement, quand on arrive sur la page, l'animation des noeuds qui se chargent se lance, mais si on a la souris sur un noeud, ça bug parce que ça déclenche une autre animation en même temps. Donc cette animation de hover ne doit être activée que lorsque l'animation de chargement des noeuds est terminée.

-

Lorsque l'on ouvre un modal, la couleur du titre est noire, même couleur que le background, donc le titre est illisible : applique la couleur du noeud à la couleur du titre.

-

Certains noeuds ont les mêmes couleurs alors qu'ils ne font pas vraiment partie de la même catégorie (ex: Réseau et IA). Change donc cela.

-

Réarrange le placement des noeuds dans l'espace. Actuellement certains se chevauchent dessus. Ce n'est pas bon, on préfère quand ça occupe bien l'espace.

-

Lorsque l'on ouvre un modal, il y a les barres de scroll qui apparaissent. Bien, mais leur style ne va pas du tout avec la page. Est-ce que tu peux faire des barres de scrolling custom ? Qui suivent le style du modal et brutaliste du site.

-

Le texte dans les noeuds est un tout petit peu petit. Arrange le un peu et rend le un peu plus stylé.

-

Il faut que tu fixes les labels car certains ne correspondent pas du tout au projet. Exemple concret : Geodessin ne contient pas du tout de Natural Language Processing (NLP) donc ce tag ne va pas. Idem pour Kamen Bot, où ce serait plus du LLM que du NLP. Affine donc les tags sur tous les projets. Aussi on ne veut pas afficher les tags lorsqu'on ouvre un projet.

-

Rajoute cette fonctionnalité : lorsque l'on clique en dehors du modal, cela ferme le modal.

-

Actuellement le modal prend une certaine partie de l'écran, mais pas assez. Agrandis donc l'espace que ça prend (pas tout l'écran quand même) et agrandit donc un peu les tailles des polices des modals. Aussi là petit soucis, il faudrait qu'on utilise des polices agréables à lire : actuellement tu utilises seulement du texte en majuscule ce qui n'aide pas à la lecture. N'hésite pas à mieux distinguer les différents points des catégories d'un projet. N'oublie pas qu'il y aura un espace pour l'image du projet.

-

Rajoute le lien de l'image du projet dans le .json des projets. Fais bien attention au path qui sera utilisé puisqu'on charge le .json dans la page après.

Projets à rajouter :
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/hretail/mini-rsa-cryptographie
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/maguidi/sae-courbes-elliptiques
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/hretail/laby-chan
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/hretail/tfr-tournoi-football-robot
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/hretail/stabilisation_etu
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/nabe/sae_geodessin_groupeevanrimonteil
- [ ] https://gitlab-ce.iut.u-bordeaux.fr/hretail/sae-deep-learning
- [ ] https://github.com/hugoretail/Kamen-Bot
- [ ] https://github.com/hugoretail/My-IUT-Skills
- [ ] https://github.com/hugoretail/CoNLL-2003-NER
- [ ] https://github.com/hugoretail/Twitter-Sentiment-Analysis
- [ ] https://github.com/hugoretail/Super-Kamen-Bot
- [ ] https://github.com/hugoretail/Eco-Presents
- [ ] https://github.com/hugoretail/Portfolio-Experiments
- [ ] https://github.com/hugoretail/D2L-Tutorial
- [ ] https://github.com/hugoretail/Portfolio