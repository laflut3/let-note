# Script de deploiement Kubernetes

Documentation centralisee du script [`deploy-app.sh`](./deploy-app.sh).

## Commandes

| Commande | Effet | Quand l'utiliser |
| --- | --- | --- |
| `./deploy-app.sh dev` | Deploie l'environnement `dev` en mode `auto`. | Usage courant dev. |
| `./deploy-app.sh staging` | Deploie l'environnement `staging` en mode `auto`. | Usage courant staging. |
| `./deploy-app.sh prod` | Deploie l'environnement `prod` en mode `auto`. | Usage courant prod. |
| `./deploy-app.sh all` | Deploie `dev`, `staging`, puis `prod`. | Mise a jour globale. |
| `./deploy-app.sh prod --app-only` | Applique uniquement les deployments `backend` et `front` rendus par Helm. | Redeploiement applicatif sans toucher infra, ingress, TLS, Postgres ou secrets. |
| `./deploy-app.sh prod --full` | Applique tout le chart Helm et execute les taches infra. | Bootstrap ou changement d'infra volontaire. |
| `./deploy-app.sh prod --full --allow-cert-change` | Autorise un changement du host TLS existant. | Rotation volontaire du certificat cert-manager. |
| `./deploy-app.sh prod --full --argocd` | Applique aussi l'ApplicationSet ArgoCD. | Uniquement si GitHub `main` contient deja le chart voulu. |
| `./deploy-app.sh prod --force-restart` | Force un nouveau rollout meme avec le meme tag image. | Redemarrer les pods applicatifs sans changer de version. |
| `./deploy-app.sh --help` | Affiche l'aide du script. | Verification rapide des options disponibles. |

## Modes

| Mode | Selection | Ressources appliquees | Taches executees | Risque certificat |
| --- | --- | --- | --- | --- |
| `auto` | Mode par defaut. | `full` si `backend`/`front` n'existent pas, sinon `app-only`. | Selon le mode resolu. | Faible apres bootstrap, car les redeploiements deviennent applicatifs. |
| `app-only` | `--app-only` ou `DEPLOY_SCOPE=app`. | Uniquement les ressources avec `app=backend` et `app=front`. | Rollout backend/front et verification des images. | Aucun changement d'Ingress ou Certificate. |
| `full` | `--full` ou premier deploy en `auto`. | Tout le rendu Helm de l'environnement. | Bootstrap cluster, secrets runtime, Postgres, migrations, TLS dev/staging, rollouts. | Bloque le changement TLS existant sans `--allow-cert-change`. |

## Options CLI

| Option | Defaut | Effet |
| --- | --- | --- |
| `--app-only` | Non | Force le mode applicatif: applique seulement `backend` et `front`. |
| `--full` | Non | Force l'application complete du chart Helm et des taches infra. |
| `--argocd` | Non | Applique l'ApplicationSet ArgoCD `let-note`, qui genere les Applications `dev`, `staging` et `prod`. Git doit etre a jour, sinon ArgoCD peut restaurer un ancien etat. |
| `--allow-cert-change` | Non | Autorise un changement de DNS sur le certificat TLS existant. Sans cette option, le script stoppe pour eviter les rate limits Let's Encrypt. |
| `--allow-pg-major-upgrade` | Non | Autorise un changement de version majeure PostgreSQL. Sans cette option, le script conserve l'image Postgres existante. |
| `--force-restart` | Non | Ajoute un timestamp au `deploy-id` pour forcer un rollout avec le meme tag. |
| `-h`, `--help` | Non | Affiche l'aide. |

## Variables de configuration

| Variable | Defaut | Effet |
| --- | --- | --- |
| `WAIT_TIMEOUT` | `180s` | Timeout utilise par `kubectl rollout status`. |
| `DEPLOY_SCOPE` | `auto` | Mode par defaut si aucune option `--app-only` ou `--full` n'est passee. Valeurs utiles: `auto`, `app`, `app-only`, `full`. |
| `APPLY_ARGOCD` | `false` | Equivalent env de `--argocd` si defini a `true`. |
| `VAULT_ADDR` | `http://vault.vault.svc.cluster.local:8200` | Adresse Vault utilisee par le script et injectee dans le backend. |
| `VAULT_KV_MOUNT` | `secret` | Mount KV utilise pour lire les secrets applicatifs. |
| `VAULT_APP_NAME` | `let-note` | Nom applicatif utilise pour construire le path Vault par defaut: `<env>/let-note`. |
| `VAULT_SECRET_PATH_DEV` | `dev/let-note` | Path Vault specifique pour `dev`. |
| `VAULT_SECRET_PATH_STAGING` | `staging/let-note` | Path Vault specifique pour `staging`. |
| `VAULT_SECRET_PATH_PROD` | `prod/let-note` | Path Vault specifique pour `prod`. |
| `INGRESS_HOST_DEV` | `dev.app.local` ou Vault `INGRESS_HOST` en full | Host ingress force pour `dev`. |
| `INGRESS_HOST_STAGING` | `staging.app.local` ou Vault `INGRESS_HOST` en full | Host ingress force pour `staging`. |
| `INGRESS_HOST_PROD` | `prod.app.local` ou Vault `INGRESS_HOST` en full | Host ingress force pour `prod`. |
| `VAULT_AUTH_METHOD` | `kubernetes` | Methode d'auth Vault si aucun token statique n'est fourni. |
| `VAULT_K8S_AUTH_MOUNT` | `kubernetes` | Mount d'auth Kubernetes dans Vault. |
| `VAULT_K8S_SERVICE_ACCOUNT` | `let-note-backend` | ServiceAccount utilise pour generer le JWT Kubernetes. |
| `VAULT_K8S_ROLE` | `let-note-<env>` | Role Vault commun si aucun role par environnement n'est defini. |
| `VAULT_K8S_ROLE_DEV` | `let-note-dev` | Role Vault specifique pour `dev`. |
| `VAULT_K8S_ROLE_STAGING` | `let-note-staging` | Role Vault specifique pour `staging`. |
| `VAULT_K8S_ROLE_PROD` | `let-note-prod` | Role Vault specifique pour `prod`. |
| `VAULT_K8S_TOKEN_DURATION` | `10m` | Duree du token cree par `kubectl create token`. |
| `VAULT_ADMIN_TOKEN` | Vide | Token Vault statique prioritaire pour lire les secrets. |
| `VAULT_TOKEN` | Vide | Token Vault statique utilise si `VAULT_ADMIN_TOKEN` est absent. |
| `VAULT_K8S_NAMESPACE` | `vault` | Namespace du pod Vault si le binaire `vault` local est absent. |
| `VAULT_K8S_POD` | `vault-0` | Pod Vault utilise en fallback via `kubectl exec`. |
| `ENABLE_HTTPS` | `false` | Active la creation d'un secret TLS local pour `dev`/`staging`. Ignore en prod. |
| `TLS_MODE` | `auto` | Mode de generation TLS local: `auto`, `mkcert` ou self-signed. |
| `TLS_SECRET_NAME` | `app-tls` | Nom du secret TLS et du Certificate cert-manager surveille par le garde-fou. |
| `TLS_CERT_DAYS` | `365` | Duree du certificat auto-signe local. |
| `MKCERT_INSTALL_CA` | `true` | Lance `mkcert -install` si `TLS_MODE=mkcert` ou `auto` avec `mkcert` disponible. |

## Fichier `deploy-config.toml`

| Cle | Valeurs | Effet |
| --- | --- | --- |
| `[deploy].version` | Exemple: `1.0.2` | Version image applicative. |
| `[deploy].arch` | `amd64`, `arm64`, `multi` | Suffixe du tag image. `multi` garde seulement la version. |

Exemple:

```toml
[deploy]
version = "1.0.2"
arch = "amd64"
```

Avec cet exemple, les images attendues sont:

| Composant | Image |
| --- | --- |
| Backend | `ghcr.io/laflut3/let-note-backend:1.0.2-amd64` |
| Frontend | `ghcr.io/laflut3/let-note-frontend:1.0.2-amd64` |

## Chart Helm

| Chemin | Role |
| --- | --- |
| `helm/let-note/Chart.yaml` | Metadata du chart. |
| `helm/let-note/values.yaml` | Valeurs communes aux environnements. |
| `helm/let-note/environments/dev.yaml` | Surcharges dev. |
| `helm/let-note/environments/staging.yaml` | Surcharges staging. |
| `helm/let-note/environments/prod.yaml` | Surcharges prod. |
| `helm/let-note/templates/` | Templates Kubernetes rendus par Helm. |
| `argocd/applicationset.yaml` | Declaration GitOps unique qui genere les Applications ArgoCD `dev`, `staging` et `prod`. |

Rendu manuel:

```bash
helm template let-note-dev ./helm/let-note --namespace dev -f ./helm/let-note/environments/dev.yaml
```

## Secrets Vault lus par le script

| Champ | Obligatoire | Effet |
| --- | --- | --- |
| `PS_BDD_DB` | Oui | Base PostgreSQL applicative. |
| `PS_BDD_USER` | Oui | Utilisateur PostgreSQL applicatif. |
| `PS_BDD_PASS` | Oui | Mot de passe PostgreSQL applicatif. |
| `S3_ACCESS_KEY` | Oui | Cle d'acces S3 injectee dans Kubernetes. |
| `S3_SECRET_KEY` | Oui | Cle secrete S3 injectee dans Kubernetes. |
| `S3_ENDPOINT` | Non | Endpoint S3; fallback `http://seaweed-s3:8333`. |
| `S3_REGION` | Non | Region S3; fallback `us-east-1`. |
| `S3_BUCKET` | Non | Bucket S3; fallback `let-note-files`. |
| `INGRESS_HOST` | Non | Host ingress lu en mode `full` si aucune variable `INGRESS_HOST_<ENV>` n'est definie. |

## Garde-fous

| Sujet | Comportement |
| --- | --- |
| Certificat TLS prod | En mode `full`, si `Certificate/app-tls` existe deja avec un DNS different du host demande, le script stoppe. Utiliser `--allow-cert-change` uniquement pour une rotation volontaire. |
| ArgoCD | Le script n'applique plus ArgoCD par defaut. Utiliser `--argocd` seulement quand GitHub `main` contient le chart voulu. L'ApplicationSet cree ou met a jour les trois Applications. |
| PostgreSQL | Si une version majeure differente est detectee, le script conserve l'image Postgres actuelle sauf avec `--allow-pg-major-upgrade`. |
| Redeploiement applicatif | En mode `app-only`, le script ne touche pas l'Ingress, le Certificate, les secrets, Postgres, SeaweedFS ou les migrations. |

## Workflow recommande

| Situation | Commande |
| --- | --- |
| Premier deploiement d'un environnement | `./deploy-app.sh <env> --full` |
| Redeploiement front/back courant | `./deploy-app.sh <env> --app-only` |
| Changement volontaire d'Ingress/TLS | `./deploy-app.sh <env> --full --allow-cert-change` |
| Utilisation GitOps ArgoCD | Commit/push sur GitHub `main`, puis `./deploy-app.sh <env> --full --argocd` pour appliquer l'ApplicationSet |
| Diagnostic rapide apres deploy | `kubectl -n <env> get deploy,pods,svc,ingress` |
