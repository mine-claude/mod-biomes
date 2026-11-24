# Biomas do Mundo

Mod **oficial** do [MineClaude](https://mineclaude.com). Id `biomes`, versão `0.1.0`. Repositório público.

Este mod **vem junto** com o servidor oficial: quem joga em https://mineclaude.com já tem ele. Este
repositório é para quem hospeda o próprio servidor, ou quer ler como ele é feito.

> Num servidor que já traz este mod como **pasta** na `MODS_DIR` (`mods/biomes/`), não ponha o
> `.mcmod` do lado: seriam dois mods com o id `biomes`. Use um ou o outro.

## O que ele faz

Biomas originais para os mundos novos, cada um com os seus blocos, a sua vegetação e as criaturas que moram nele. Biomas: Floresta Musgosa, Brejo Luminoso, Dunas Vermelhas, Prado Florido, Bosque de Copas Altas, Geodos de Cristal, Costa de Corais, Planalto das Ruínas, Savana Dourada, Bosque de Cogumelos Gigantes, Ipezal e Taiga Nevada. Arte gerada por código.

## Instalar

Baixe o `.mcmod` da [última Release](../../releases/latest) e escolha um caminho:

- **Pasta de mods:** ponha o arquivo **`biomes.mcmod`** (o nome importa: o servidor exige que seja o id do mod) na `MODS_DIR` do servidor e reinicie. A Release traz esse nome pronto, ao lado da cópia com a versão no nome.
- **No jogo:** `/mod previa <link do .mcmod>`, ou a tela **Mods**.

Lado: servidor + navegador.

## Montar e empacotar aqui

Só precisa do [Bun](https://bun.sh) — nada do repositório do jogo:

```
bun tools/pack.mjs
```

Sai um `biomes-0.1.0.mcmod` determinístico (mesma entrada, mesmos bytes).

## Publicar uma versão

Suba a `version` no `package.json`, comite, e marque:

```
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `.github/workflows/release.yml` monta, empacota e cria a Release com o `.mcmod` anexado.

## Arte

Arte 100% original, pintada por código.

Os arquivos de `lang/`, `textures/` são o **resultado** dessa pintura, comitados como PNG/JSON/WAV.
Os geradores que os desenham ficam no repositório do jogo (eles leem o escritor de PNG de lá), então não
vêm neste repositório — o que vem é a arte pronta, e montar aqui não precisa deles.
