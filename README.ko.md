<div align="center">

<img src="docs/img/banner.png" alt="DOG - Dots Of Games" width="100%">

# DOG · Dots Of Games

**코드로 만드는 도트 그래픽.** 340개가 넘는 무료 2D 게임 도트 이미지를 **한 줄로 조합하고, 크기를 바꾸고, 색을 바꿀 수 있습니다.**<br>
**228,384가지** 조합의 캐릭터 메이커도 들어 있습니다. 모든 스프라이트는 텍스트 파일이고, 의존성은 0개입니다.

[**▶ 플레이그라운드 열기**](https://olebangpad.github.io/dog/) ·
[캐릭터 메이커](#-캐릭터-메이커) ·
[상황 이펙트](#%EF%B8%8F-상황-이펙트) ·
[PNG 바로 받기](#-png만-필요하다면) ·
[코드에서 쓰기](#-코드에서-쓰기) ·
[스프라이트 추가하기](CONTRIBUTING.md) ·
[English](README.md)

<img src="docs/img/scene.png" alt="DOG 스프라이트로만 만든 애니메이션 장면" width="576">

</div>

## 왜 DOG인가요?

일반적인 에셋 팩은 정해진 PNG 묶음이라, 같은 칼을 금색으로 바꾸거나 슬라임을 게임에 맞는 분홍색으로 바꾸려면
다시 그려야 합니다.

DOG는 모든 스프라이트를 **텍스트**로 저장하고, 고정된 색 대신 **색 슬롯**으로 칠합니다.
그래서 어떤 스프라이트든 한 번의 호출로 원하는 색, 크기, 조합으로 바꿀 수 있습니다.

```js
dog('slime', { A: '#ff4fd8' }).scale(8).outline('#fff')
```

### 🧙 캐릭터 메이커

몸에 장비를 **이름만으로** 입힙니다. 몸은 머리와 손 위치를, 장비는 잡히는 지점을 알고 있어서
좌표 없이 알아서 제자리에 붙습니다. 애니메이션도 따라갑니다 (슬라임이 튀면 왕관도 같이 튑니다).

```js
dog.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })   // 24×24 이미지
dog.char('slime-pink', { hat: 'wizard' })
dog.char(dog.char.random(42))                     // 같은 시드 → 같은 캐릭터 (NPC 만들 때 좋아요)
```

몸 9종(영웅, 해골, 강아지, 고양이, 병아리, 슬라임, 유령, 해골 머리, 개구리) × 모자 10종 × 무기 9종 × 보조 장비 3종,
색 변형까지 합치면 옷 색을 바꾸기 전에도 **228,384가지** 조합이 나옵니다.

<img src="docs/img/characters.png" alt="dog.char.random()으로 만든 랜덤 캐릭터 24명" width="654">

### ⚔️ 상황 이펙트

캐릭터에게 **행동**을 시킬 수 있습니다. 이펙트는 알아서 제자리에 붙습니다. 베기는 무기 든 손에,
데미지 숫자와 "LV UP"은 모자 위에, 연기는 몸 위에 나옵니다. 속성을 고르면 이펙트 색이 바뀌고,
맞을 때는 캐릭터도 불타거나 얼거나 중독된 색으로 변합니다.

```js
const frames = dog.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire')
// 항상 32×32 이미지 8프레임, frames.fps 속도로 재생 → 스프라이트 시트에 바로 사용

dog.action('slime', 'hit', { element: 'ice', amount: '-12' })
dog.action('hero-mage', 'cast', '#00ffcc')      // 재질 이름이나 hex 색도 속성으로 쓸 수 있어요
```

**행동 6종**(`attack` 공격, `hit` 피격, `heal` 회복, `levelup` 레벨업, `cast` 시전, `death` 사망) ×
**속성 5종**(`fire` 불, `ice` 얼음, `poison` 독, `holy` 빛, `dark` 어둠)을 228,384가지 캐릭터 누구에게나 쓸 수 있습니다.

<img src="docs/img/actions.png" alt="모든 행동과 속성 조합 애니메이션" width="672">

### 🎨 그림 하나로 모든 색을

스프라이트는 최대 3개의 4단계 색 램프(`A`, `B`, `C`)로 칠해져 있습니다. 슬롯을 18가지 재질 중 하나로 바꾸거나,
**아무 hex 색**을 넣으면 명암(색조 이동 포함)이 자동으로 만들어집니다.

<img src="docs/img/recolor.png" alt="재질 18종 포션, hex 색 12종 슬라임, 재질 9종 칼" width="100%">

### 🧩 도트끼리 조합

`compose()`로 레이어를 쌓고 `.at(x, y)`로 위치를 잡습니다. 캔버스는 알아서 늘어납니다.

<img src="docs/img/combine.png" alt="영웅 + 왕관 = 왕, 영웅 + 투구 = 기사, 강아지 + 마법사 모자" width="348">

### 🔍 크기를 키우고 줄여도 선명하게

최근접 확대, **Scale2x** 부드럽게 확대, 다수결 축소(외곽선 유지), 외곽선, 그림자, 색조, 뒤집기, 회전을
모두 체인으로 연결할 수 있습니다.

<img src="docs/img/size.png" alt="같은 슬라임을 1x, 2x, 4x, 스무딩, 축소, 외곽선, 그림자, 색조 변경" width="100%">

## 🖼 수록 스프라이트

7개 카테고리, 기본 90종, 변형 포함 **346가지**, 이 중 17종은 애니메이션입니다.
캐릭터, 착용 장비, 무기, 방어구, 포션, 보석, 음식, 몬스터, 이어 붙일 수 있는 타일, 소품, UI 아이콘, 말풍선 이모트,
이펙트(폭발, 반짝임, 연기, 타격, 베기)가 들어 있습니다.

<img src="docs/img/gallery.png" alt="DOG의 모든 기본 스프라이트" width="100%">

## 📦 PNG만 필요하다면

[`assets/`](assets) 폴더에 모두 미리 뽑아 두었습니다. 빌드할 필요가 없습니다.

| 폴더 | 내용 |
| --- | --- |
| `assets/png/` | 모든 스프라이트 16×16 (예: `potion-mana.png`) |
| `assets/png@4x/` | 같은 이미지 64×64 |
| `assets/anim/` | 애니메이션 PNG (4배) |
| `assets/strips/` | 게임 엔진용 가로 프레임 스트립 (1배) |
| `assets/atlas.png` + `atlas.json` | 모든 프레임이 들어간 텍스처 아틀라스와 애니메이션 목록 |

모든 그림은 **CC0**입니다. 상업용 게임에도 출처 표기 없이 쓸 수 있습니다 (표기해 주시면 감사합니다 ❤).

## 💻 코드에서 쓰기

**브라우저** (설치 없이 jsDelivr로 GitHub에서 바로):

```html
<script type="module">
  import { dog, compose } from 'https://cdn.jsdelivr.net/gh/olebangpad/dog@main/src/index.js'

  const king = compose(dog('hero'), dog('crown').at(0, -7)).scale(8)
  document.body.append(king.toCanvas())
</script>
```

**Node** (레포를 받기만 하면 됩니다. 설치할 것 없음):

```js
import { dog, compose, sheet } from './src/index.js'

await dog('sword', { A: 'gold', C: 'red' }).scale(4).save('gold-sword.png')

const frames = dog.frames('slime-blue')            // 애니메이션 모든 프레임
await sheet(frames).image.scale(4).save('slime-sheet.png')
```

**CLI**:

```bash
node scripts/dog.js list monsters
node scripts/dog.js render potion -A '#ff4fd8' --scale 8 --outline '#fff' -o potion.png
node scripts/dog.js render explosion --anim --scale 4 -o boom.png      # 애니메이션 PNG
node scripts/dog.js combine hero crown@0,-7 --scale 6 -o king.png
node scripts/dog.js char hero-elf --hat wizard --hand staff-fire -A purple --scale 6 -o mage.png
node scripts/dog.js char --random 42 --scale 6 -o npc.png
node scripts/dog.js char hero --hand sword --action attack --element fire --anim --scale 4 -o slash.png
```

## ✏️ 스프라이트는 그냥 텍스트

| 문자 | 의미 |
| --- | --- |
| `.` | 투명 |
| `#` | 외곽선 |
| `w` | 흰색 하이라이트 |
| `1 2 3 4` | 램프 **A**, 어두움 → 밝음 |
| `5 6 7 8` | 램프 **B**, 어두움 → 밝음 |
| `a b c d` | 램프 **C**, 어두움 → 밝음 |

픽셀이 색이 아니라 *명암 단계*를 가리키기 때문에 색을 바꿔도 음영이 그대로 유지됩니다.
PR에서도 픽셀 변경이 텍스트 diff로 보입니다.

## 📚 API

| 호출 | 기능 |
| --- | --- |
| `dog(id, { A, B, C, frame })` | 스프라이트 렌더링. `A/B/C`에는 재질 이름, hex 색, 4색 배열 |
| `dog.frames(id, opts)` | 애니메이션 전체 프레임 |
| `dog.list({ category, tag, variants })` | 전체 id 목록 |
| `dog.char(body, { hat, hand, offhand, A })` | 장비를 이름으로 입힌 24×24 캐릭터 |
| `dog.char.frames(spec)` · `dog.char.random(seed)` | 애니메이션 프레임 · 시드로 재현되는 랜덤 캐릭터 |
| `dog.action(spec, name, element)` | 행동 애니메이션 8프레임 (32×32, `.fps`) |
| `compose(...layers)` | 레이어 합성, `.at(x, y)`로 위치 지정 |
| `sheet(images, { columns, gap })` | 스프라이트 시트로 묶기 |
| `text('SCORE 9', { color })` | 내장 3×5 도트 폰트 |

크기: `.scale(n)` `.smooth()` `.resize(w, h)` `.downscale(k)` `.pad()` `.crop()` `.trim()`<br>
색: `.hue()` `.adjust()` `.swap()` `.quantize()` `.tint()` `.grayscale()`<br>
효과/출력: `.outline()` `.shadow()` `.silhouette()` `.flipX()` `.flipY()` `.rotate()` `.toPNG()` `.toCanvas()` `.save()`

재질: `red orange gold lime green mint ice blue purple pink wood leather skin sand iron stone bone shadow`

## 🤝 기여하기

새 스프라이트 추가가 가장 반가운 기여입니다. 2분이면 됩니다.

1. [플레이그라운드](https://olebangpad.github.io/dog/) → **Edit pixels** → 그리기 → **Copy sprite definition**
2. [`src/sprites/`](src/sprites)의 알맞은 파일에 붙여넣고 `variants` 몇 개 추가
3. `npm run check && npm run build` 후 PR

스타일 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다. 원하는 스프라이트를 이슈로 요청해도 좋습니다.

## 📄 라이선스

- **그림** (`src/sprites/`, `assets/`, `docs/img/`): [CC0 1.0](LICENSE-ASSETS), 퍼블릭 도메인
- **코드**: [MIT](LICENSE)

그림 그리는 시간을 아껴 드렸다면 ⭐ 하나가 다른 개발자들이 이 프로젝트를 찾는 데 큰 도움이 됩니다.
