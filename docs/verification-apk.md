# Vérifier l’APK GeoGame

Télécharger `geogame.apk` et `geogame.apk.sha256` depuis le même tag du [dépôt public GeoGame-releases](https://github.com/SDMM27/GeoGame-releases/releases). Avec les deux fichiers dans le même dossier :

```sh
sha256sum -c geogame.apk.sha256
apksigner verify --print-certs geogame.apk
```

Sur Windows, `Get-FileHash .\geogame.apk -Algorithm SHA256` donne l’empreinte à comparer à celle du fichier `.sha256`. Pour une ancienne release sans ce fichier, utiliser le SHA-256 de l’asset `geogame.apk` indiqué par GitHub.

La signature doit être valide et la ligne `Signer #1 certificate SHA-256 digest` doit contenir cette empreinte du certificat de l’APK distribué directement :

```text
6fc729eab4856cfac4f551d7d4a99cbf596ed6a9d8be5ae95a87e18c246899be
```

Le SHA-256 du fichier identifie une version précise. L’empreinte du certificat identifie le signataire et s’applique aux versions successives de cet APK. Une version distribuée par le Play Store peut être signée par un autre certificat.

En cas de rotation de la clé EAS, confirmer l’empreinte du certificat public dans EAS et vérifier la mise à jour sur un appareil qui dispose déjà de l’APK. Mettre ensuite à jour l’empreinte dans ce document et dans `scripts/verify-release-apk.sh` avant de publier.
