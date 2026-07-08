# almubarak.dev

Personal portfolio of **Ali Almubarak** — full-stack developer & security enthusiast.

Static site (no build step): HTML + CSS + vanilla JS with a [Three.js](https://threejs.org) 3D
"network core" background (vendored in `js/three.module.min.js`).

## Structure

```
index.html            single-page portfolio
css/style.css         all styles (dark security-terminal theme)
js/main.js            3D scene, typing terminal, scramble/tilt/reveal effects
js/three.module.min.js vendored three.js r160
images/               logos & project screenshots
.github/workflows/deploy.yml   CI/CD → VPS
```

## Local preview

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

## Deployment

Every push to `main` triggers the **Deploy to VPS** GitHub Action, which rsyncs the
site to `/var/www/almubarak.dev` on the server (nginx serves it directly).

Required repo secret:

| Secret | Value |
|---|---|
| `VPS_SSH_KEY` | private half of the dedicated deploy key (`~/.ssh/almubarak_deploy`) |

Manual deploy from local machine:

```sh
rsync -avz --delete --exclude '.git' --exclude '.github' --exclude 'README.md' --exclude '.gitignore' \
  -e "ssh -i ~/.ssh/my_vps" ./ linuxuser@209.250.245.80:/var/www/almubarak.dev/
```
