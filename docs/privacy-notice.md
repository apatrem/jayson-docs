# Document System Privacy Notice

## English

Document System is a local desktop app for internal consultancy staff. It does not collect usage telemetry in v1. No analytics, behavioral tracking, accept/reject ratios, edit patterns, prompt text, or response text are stored or sent to consultancy-owned servers.

During install, the app stores:

- User identity fields used for attribution: name, email, role, and initials.
- Local paths for the cloud-sync document folder and shared brand folder.
- LLM provider and model preferences.
- LLM API keys in the operating-system keychain, never in `config.yaml`.

The app also keeps a local operational cost ledger because monthly LLM limits cannot work without it. The ledger stores only:

- API-call timestamp.
- Model name.
- Input token count.
- Output token count.
- Computed cost.
- Document ID.
- Aggregates by document, day, and month.

The cost ledger never stores:

- Prompt contents.
- Response contents.
- Block IDs.
- Comment IDs.
- Comment text.
- Accept/reject outcomes.
- Editing patterns.
- Any behavioral signal beyond what is required to compute spend.

The cost ledger is a local SQLite database at the app config path, for example `~/Library/Application Support/DocSystem/cost.db` on macOS. It is never written to the cloud-sync folder and is never transmitted off the machine by the app. Rows older than 13 months are pruned automatically.

Consultants can view cost rows in `Settings -> My LLM Spend`, clear all cost history with the wipe button, or disable cost tracking entirely. Disabling cost tracking also disables monthly limits because the limits depend on the ledger.

## Français

Document System est une application de bureau locale pour les équipes internes du cabinet. La v1 ne collecte aucune télémétrie d'usage. Aucune donnée d'analyse, aucun suivi comportemental, aucun taux d'acceptation/rejet, aucun schéma d'édition, aucun prompt et aucune réponse de modèle ne sont stockés ni envoyés vers des serveurs du cabinet.

Pendant l'installation, l'application stocke :

- Les informations d'identité nécessaires à l'attribution : nom, e-mail, rôle et initiales.
- Les chemins locaux vers le dossier de documents synchronisé et le dossier partagé de marque.
- Les préférences de fournisseur et de modèle LLM.
- Les clés API LLM dans le trousseau du système d'exploitation, jamais dans `config.yaml`.

L'application conserve aussi un registre local des coûts, strictement opérationnel, car les plafonds mensuels LLM ne peuvent pas fonctionner sans lui. Ce registre stocke uniquement :

- L'horodatage de l'appel API.
- Le nom du modèle.
- Le nombre de tokens en entrée.
- Le nombre de tokens en sortie.
- Le coût calculé.
- L'identifiant du document.
- Des agrégats par document, jour et mois.

Le registre des coûts ne stocke jamais :

- Le contenu des prompts.
- Le contenu des réponses.
- Les identifiants de blocs.
- Les identifiants de commentaires.
- Le texte des commentaires.
- Les décisions d'acceptation/rejet.
- Les schémas d'édition.
- Tout signal comportemental autre que ce qui est nécessaire au calcul du coût.

Le registre des coûts est une base SQLite locale située dans le dossier de configuration de l'application, par exemple `~/Library/Application Support/DocSystem/cost.db` sur macOS. L'application ne l'écrit jamais dans le dossier synchronisé et ne le transmet jamais hors de la machine. Les lignes de plus de 13 mois sont supprimées automatiquement.

Les consultants peuvent consulter les lignes de coût dans `Settings -> My LLM Spend`, effacer tout l'historique avec le bouton de suppression, ou désactiver complètement le suivi des coûts. Désactiver le suivi des coûts désactive aussi les plafonds mensuels, car ces plafonds dépendent du registre.
