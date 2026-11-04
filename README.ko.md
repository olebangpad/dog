<div align="center">

<img src="docs/img/banner.png" alt="DOG - Dots Of Games" width="100%">

# DOG · Dots Of Games

**코드로 만드는 도트 그래픽.** 250개가 넘는 무료 2D 게임 도트 이미지를 **한 줄로 조합하고, 크기를 바꾸고, 색을 바꿀 수 있습니다.**<br>
모든 스프라이트는 텍스트 파일입니다. 의존성 0개, 브라우저와 Node 양쪽에서 동작합니다.

[**▶ 플레이그라운드 열기**](https://olebangpad.github.io/dog/) ·
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

6개 카테고리, 기본 67종, 변형 포함 **257가지**, 이 중 16종은 애니메이션입니다.
캐릭터, 무기, 방어구, 포션, 보석, 음식, 몬스터, 이어 붙일 수 있는 타일, 소품, UI 아이콘, 말풍선 이모트,
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
