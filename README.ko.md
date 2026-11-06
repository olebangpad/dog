<div align="center">

<img src="docs/img/banner.png" alt="PixSpell" width="100%">

# PixSpell

**2D 게임에 필요한 에셋 전부를 코드로.** 걷고 싸우는 캐릭터, 아이템과 타일, 빛나는 이펙트, 효과음까지
자바스크립트 한 줄로 만들고, 색과 크기를 바꿉니다. AI 코딩 에이전트에게 시켜도 됩니다. 그림은 CC0, 의존성 0개.

걷기·행동 애니메이션이 있는 캐릭터 **275만** 가지 · 스프라이트 **887**개 · 이펙트 **665**종 · 효과음 **103**개 · 음악 **17**곡 · **8~64픽셀** 어떤 타일 크기든 · Phaser·Godot 팩

[**▶ 데모 게임 하기**](https://olebangpad.github.io/pixspell/game.html) ·
[**🤖 AI 에이전트가 만든 게임**](examples/spell-survivors) ·
[**🧙 내 GitHub 영웅**](https://olebangpad.github.io/pixspell/hero.html) ·
[플레이그라운드](https://olebangpad.github.io/pixspell/) ·
[게임 만들기](#-pixspell로-게임-만들기) ·
[캐릭터 메이커](#-캐릭터-메이커) ·
[이펙트 665종](#-이펙트-665종) ·
[효과음](#-코드로-만든-효과음-103개) ·
[상황 이펙트](#%EF%B8%8F-상황-이펙트) ·
[걷기](#-8방향-걷기) ·
[비트별 다운로드 (8/16/32/64)](#-png만-필요하다면) ·
[코드에서 쓰기](#-코드에서-쓰기) ·
[스프라이트 추가하기](CONTRIBUTING.md) ·
[English](README.md)

<img src="docs/promo/code.gif" alt="PixSpell 코드를 한 줄씩 치면 분홍 슬라임, 마법사, 주문 시전, 얼음 운석, 코인 효과음이 나타나는 장면" width="100%">

[![CI](https://github.com/olebangpad/pixspell/actions/workflows/ci.yml/badge.svg)](https://github.com/olebangpad/pixspell/actions/workflows/ci.yml)
[![Agent Skill](https://img.shields.io/badge/Agent_Skill-Claude_Code_·_Codex_·_Cursor_·_more-d97757?style=flat-square)](#-pixspell로-게임-만들기)

</div>

```js
import { spell } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'   // 또는: npm i pixspell

const knight = spell.char('hero', { hat: 'knight', hand: 'sword', offhand: 'shield' })   // 장비가 알아서 붙는 24×24 캐릭터
const swing = spell.action('hero', 'attack', { element: 'fire', grid: 32 })              // 64×64 공격 8프레임 (.fps 포함)
spell.sfx('slash', { element: 'fire' }).play()                                           // 그리고 그 소리
document.body.append(knight.scale(8).toCanvas())
```

### 한 줄이 만드는 것

<table>
  <tr>
    <td align="center"><img src="docs/img/show/characters.png" width="240" alt="몸, 모자, 무기가 다른 랜덤 캐릭터들"><br><sub><code>spell.char.random(seed)</code><br>캐릭터 275만 가지</sub></td>
    <td align="center"><img src="docs/img/show/attack.png" width="240" alt="불꽃 검을 휘두르는 기사"><br><sub><code>spell.action(knight, 'attack', 'fire')</code><br>행동 6가지 × 속성 5가지</sub></td>
    <td align="center"><img src="docs/img/show/meteor.png" width="240" alt="빛나는 얼음 운석이 떨어져 터지는 모습"><br><sub><code>spell.fx('meteor', { element: 'ice', size: 64 })</code><br>빛나는 이펙트 665종</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/img/show/walk.png" width="240" alt="풀밭 위를 오른쪽으로 걷는 마법사"><br><sub><code>spell.walk(mage, 'right')</code><br>8방향 걷기</sub></td>
    <td align="center"><img src="docs/img/show/recolor.png" width="240" alt="여덟 가지 색으로 바뀌는 슬라임"><br><sub><code>spell('slime', { A: '#ff4fd8' })</code><br>어떤 스프라이트든 어떤 색이든</sub></td>
    <td align="center"><img src="docs/img/show/tornado.png" width="240" alt="불꽃 회오리"><br><sub><code>spell.fx('tornado', { element: 'fire', size: 64 })</code><br>크기를 키워도 선명하게</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/img/show/grids.png" width="240" alt="8, 16, 32, 64픽셀 타일로 그린 같은 기사"><br><sub><code>spell.char(knight, { grid: 8 })</code><br>8·16·32·64픽셀 타일</sub></td>
    <td align="center"><img src="docs/img/show/status.png" width="240" alt="불타는 해골"><br><sub><code>spell.status(skeleton, 'burning')</code><br>누구에게나 상태이상</sub></td>
    <td align="center"><img src="docs/img/show/levelup.png" width="240" alt="왕관 쓴 영웅의 레벨업"><br><sub><code>spell.action(king, 'levelup')</code><br>소리도 하나씩: <code>spell.sfx('levelup')</code></sub></td>
  </tr>
</table>

<sub>각 타일은 아래 적힌 코드로 그린 것입니다(README용으로 확대). 생성 코드는 <a href="scripts/build.js"><code>scripts/build.js</code></a>에 있습니다.
<code>knight</code>는 <code>{ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }</code>이고, <code>mage</code>, <code>skeleton</code>, <code>king</code>도 같은 형태의 스펙입니다.</sub>

**새 기능:** [세계를 만드는 타일·소품 42종](#-수록-스프라이트) · [새 몬스터 25종](#-캐릭터-메이커) · [8방향 걷기](#-8방향-걷기) · 새 아이템 26종 · [UI 키트](#-ui-키트) · [음악](#-코드로-만든-음악) · [내 GitHub 계정이 게임 영웅으로](#-내-github-계정이-게임-영웅으로) · 빛나는 이펙트 · AI 에이전트가 PixSpell로 만든 게임 [Spell Survivors](#-ai-에이전트가-pixspell로-만든-게임-하나) ·
효과음 103개 · 모든 에셋 8~64픽셀 · `npx pixspell skill` 한 줄로 어느 Agent Skills 에이전트에든 스킬 설치 · [변경 기록](CHANGELOG.md)

## 왜 PixSpell인가요?

일반적인 에셋 팩은 정해진 PNG 묶음이라, 같은 칼을 금색으로 바꾸거나 슬라임을 게임에 맞는 분홍색으로 바꾸려면
다시 그려야 합니다.

PixSpell은 모든 스프라이트를 **텍스트**로 저장하고, 고정된 색 대신 **색 슬롯**으로 칠합니다.
그래서 어떤 스프라이트든 한 번의 호출로 원하는 색, 크기, 조합으로 바꿀 수 있습니다.

```js
spell('slime', { A: '#ff4fd8' }).scale(8).outline('#fff')
```

<img src="docs/img/scene.png" alt="PixSpell 스프라이트로만 만든 애니메이션 장면" width="576">

다른 라이브러리는 보통 한 조각(주로 이펙트)만 줍니다. PixSpell은 게임에 필요한 **모든** 조각을 import 하나로 줘서,
사람이든 AI 에이전트든 빈 파일에서 시작해 보기에도 듣기에도 완성된 게임까지 갈 수 있습니다.

### 🤖 AI 에이전트가 PixSpell로 만든 게임 하나

<a href="https://olebangpad.github.io/pixspell/examples/spell-survivors/"><img src="docs/promo/survivors.gif" alt="Spell Survivors: 슬라임·고블린·해골에 둘러싸인 마법사가 불꽃 오라, 얼음 칼날, 번개, 운석을 쓰는 장면" width="640"></a>

![image files: 0](https://img.shields.io/badge/image_files-0-a8e05a?style=flat-square)
![audio files: 0](https://img.shields.io/badge/audio_files-0-a8e05a?style=flat-square)
![one HTML file](https://img.shields.io/badge/one_HTML_file-under_500_lines-a8e05a?style=flat-square)
![written by Claude Code](https://img.shields.io/badge/written_by-Claude_Code-d97757?style=flat-square)

[**▶ Spell Survivors 하기**](https://olebangpad.github.io/pixspell/examples/spell-survivors/) ·
[혼자 플레이하는 모습 보기](https://olebangpad.github.io/pixspell/examples/spell-survivors/?demo) ·
[어떤 호출로 만들었는지](examples/spell-survivors/README.md)

서바이버 장르의 아레나 게임입니다. 몰려오는 몬스터, 알아서 날아가는 주문, 레벨마다 새 주문 고르기, 타격마다 효과음.
Claude(Claude Code)가 PixSpell 스킬로, 공개 API만 써서 만들었습니다. **모든 스프라이트, 걷기 애니메이션, 빛나는 이펙트,
효과음이 PixSpell 호출입니다.**

**직접 만들어 보기.** [스킬을 설치](#-pixspell로-게임-만들기)하고 에이전트에게 같은 아이디어를 주세요.

> Make a survivor-style arena game in one HTML file using PixSpell. A wizard walks with the arrow keys, spells fire
> automatically at the nearest enemy, enemies come in growing waves, they drop gems, and every level I pick one of
> three new spells. Use PixSpell for every sprite, effect and sound, with a night-time look so the effects glow.

(한국어로 요청해도 됩니다: *"PixSpell로 HTML 파일 하나짜리 서바이버 게임 만들어줘. 마법사가 방향키로 움직이고, 주문은 가장 가까운 적에게
자동으로 날아가고, 적은 점점 많이 몰려오고, 보석을 떨어뜨리고, 레벨업마다 새 주문 세 개 중 하나를 고르게. 스프라이트·이펙트·효과음은 전부 PixSpell로, 이펙트가 빛나 보이게 밤 분위기로."*)

### 🧙 내 GitHub 계정이 게임 영웅으로

<a href="https://olebangpad.github.io/pixspell/hero.html"><img src="docs/img/hero.png" alt="영웅 카드 예시: 레벨 28 TypeScript 기사, 오늘은 전투 중" width="600"></a>

[**영웅 페이지**](https://olebangpad.github.io/pixspell/hero.html)에 GitHub 아이디를 넣으면 그 계정의 영웅이 나옵니다. 아이디가 생김새를,
가장 많이 쓴 언어가 직업과 색을(TypeScript는 기사, Go는 레인저, Rust는 대장장이, Python은 드루이드),
레포와 스타가 레벨을(레벨 15, 35에서 무기가 좋아집니다), 최근 활동이 오늘 하는 일을 정합니다:
전투 중, 모험 중, 또는 여관에서 휴식 중.

**프로필 README에 붙이면** PixSpell GitHub Action이 매일 다시 그려 줍니다. 프로필 레포(`github.com/<아이디>/<아이디>`)에
`.github/workflows/pixspell-hero.yml`을 추가하세요.

```yaml
name: PixSpell hero
on:
  schedule: [{ cron: '23 5 * * *' }]   # once a day
  workflow_dispatch:
permissions:
  contents: write
jobs:
  hero:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: olebangpad/pixspell@main
```

**Actions** 탭에서 한 번 실행한 뒤 README에 카드를 넣으면 됩니다:
`[![my PixSpell hero](pixspell-hero.png)](https://github.com/olebangpad/pixspell)`.
명령어로는 `npx pixspell hero <아이디>`입니다.

### 🎮 PixSpell로만 만든 게임 화면

[**PixSpell Quest**](https://olebangpad.github.io/pixspell/game.html)는 직접 해볼 수 있는 작은 데모입니다. 화면의 모든 픽셀이 이 레포에서 나옵니다.
주인공은 `spell.char()`, 걷기는 `spell.walk()`, 공격은 `spell.action('attack')`, 적이 맞으면 `spell.action('hit')`,
쓰러지면 `spell.action('death')`, 크리티컬·코인 획득·적이 사라지는 연기·레벨업 꽃가루·모닥불 불빛·반딧불은 `spell.fx()`이고,
직접 조작하기 시작하면 공격·타격·코인·레벨업마다 `spell.sfx()` 효과음이 나고, 타일·코인·하트·HUD 글자도 전부 스프라이트와 도트 폰트입니다.
키를 누르기 전까지는 혼자 플레이하고, 캐릭터 메이커의 **▶ Play as this character** 버튼으로 내가 만든 캐릭터로 플레이할 수 있습니다.

<a href="https://olebangpad.github.io/pixspell/game.html"><img src="docs/promo/gameplay.gif" alt="PixSpell Quest 플레이 화면" width="512"></a>

세로형 홍보 영상 (`scripts/record-promo.cjs`로 생성): [English](docs/promo/pixspell-reel-en.mp4) · [한국어](docs/promo/pixspell-reel-ko.mp4) ·
이펙트 영상 [English](docs/promo/fx-reel-en.mp4) · [한국어](docs/promo/fx-reel-ko.mp4)

### 🛠 PixSpell로 게임 만들기

설치 없이 바로 시작하는 것부터 게임 엔진까지, 세 가지 방법이 있습니다.

**1. 템플릿 복사하기.** [`templates/canvas/index.html`](templates/canvas/index.html)은 파일 하나짜리 완성된 작은 게임입니다.
설치도 빌드도 필요 없습니다. [`templates/phaser/`](templates/phaser)는 같은 게임을 Phaser 3와 PixSpell 게임 팩으로 만든 버전입니다.

**2. 게임 팩 다운로드.** [캐릭터 메이커](https://olebangpad.github.io/pixspell/#maker)에서 **📦 Game pack**을 누르면 zip 하나에
스프라이트 시트(`idle`, 4방향 `walk`, `attack`, `hit`, `heal`, `levelup`, `cast`, `death`), Aseprite/Phaser용 JSON, Godot 4용 SpriteFrames 파일이 들어 있습니다.
코드로는 `spell.pack(spec)`, 명령어로는 `node scripts/pixspell.js pack hero --hat crown --hand sword`입니다.

```js
// Phaser 3
this.load.aseprite('hero', 'hero.png', 'hero.json')
const hero = this.add.sprite(160, 120, 'hero').setOrigin(0.5, 31 / 32)
hero.anims.createFromAseprite('hero')
hero.play({ key: 'walk-left', repeat: -1 })
```

**3. AI 코딩 에이전트에게 맡기기.** PixSpell은 전부 코드와 텍스트라서, 에이전트가 이미지 파일 없이도 다 쓸 수 있습니다.
스킬이 들어 있습니다: [`skills/pixspell/SKILL.md`](skills/pixspell/SKILL.md)(API, 도트 그래픽 규칙, 게임 레시피, 엔진 내보내기, 효과음, 타일 크기)와
[`catalog.md`](skills/pixspell/catalog.md)(모든 스프라이트 이름). 예제 코드는 CI에서 실제로 실행해 검증합니다.

- **Claude Code:** 플러그인으로 설치하고 요청만 하면 됩니다.
  ```
  /plugin marketplace add olebangpad/pixspell
  /plugin install pixspell@pixspell
  ```
- **Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode** 등 [Agent Skills를 지원하는 에이전트](https://agentskills.io/clients):
  프로젝트에서 아래 명령을 실행하세요. 이 에이전트들이 스킬을 찾는 `.agents/skills/pixspell/`에 스킬을 복사합니다
  (`--claude`를 붙이면 `.claude/skills/`에 넣습니다).
  ```
  npx pixspell skill
  ```
- **설치 없이 아무 에이전트에서나:** 채팅에 이렇게 붙여넣으세요.
  > https://raw.githubusercontent.com/olebangpad/pixspell/main/skills/pixspell/SKILL.md 를 읽고, 스프라이트·이펙트·효과음은 전부
  > PixSpell로 만들어줘. 단검 든 고블린이 슬라임이랑 싸우는 탑다운 게임을 만들어줘.

그리고 *"PixSpell로 단검 든 고블린이 슬라임이랑 싸우는 탑다운 게임 만들어줘. 효과음도 넣어줘"*처럼 요청하면 됩니다.
[`llms.txt`](llms.txt)를 읽게 해도 됩니다.

**에이전트가 고른 걸 직접 보게 하기.** 이름만으로는 스프라이트가 어떻게 생겼는지 알 수 없으니, PixSpell은 에이전트에게 눈을 줍니다.

- `npx pixspell preview slime meteor "spell.action('hero', 'attack', 'fire')"`는 모든 프레임을 확대해 이미지 한 장에 그리고,
  각각의 크기·프레임 수·fps를 알려 줍니다. 스킬이 에이전트에게 이걸로 고른 에셋을 확인하라고 안내합니다.
- **MCP 서버**(의존성 없음): `claude mcp add pixspell -- npx -y pixspell mcp`, 다른 MCP 클라이언트에서는 `npx -y pixspell mcp`.
  `preview` 도구가 그 이미지를 각 항목의 자바스크립트 호출과 함께 에이전트에게 바로 돌려주고, `catalog`는 이름을 찾고,
  `save`와 `pack`은 PNG·WAV·엔진용 팩을 프로젝트에 저장합니다.
- `npx pixspell doctor`는 Node, 렌더링, 에이전트가 읽을 스킬 사본을 점검합니다.

### 🧙 캐릭터 메이커

몸에 장비를 **이름만으로** 입힙니다. 몸은 머리와 손 위치를, 장비는 잡히는 지점을 알고 있어서
좌표 없이 알아서 제자리에 붙습니다. 애니메이션도 따라갑니다 (슬라임이 튀면 왕관도 같이 튑니다).

```js
spell.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })   // 24×24 이미지
spell.char('slime-pink', { hat: 'wizard' })
spell.char(spell.char.random(42))                     // 같은 시드 → 같은 캐릭터 (NPC 만들 때 좋아요)
```

몸 37종 × 모자 18종 × 무기 15종 × 보조 장비 6종, 색 변형까지 합치면 옷 색을 바꾸기 전에도 **2,763,928가지** 조합이 나옵니다.
몸은 사람(영웅, 여자 영웅, 해골, 고블린, 로봇), 동물(강아지, 고양이, 병아리), 그리고 모든 몬스터입니다.

<img src="docs/img/characters.png" alt="spell.char.random()으로 만든 랜덤 캐릭터 24명" width="654">

**몬스터 31종, 전부 캐릭터 몸체입니다:** 슬라임, 박쥐, 유령, 해골 머리, 눈알, 개구리, 거미, 뱀, 쥐, 늑대, 버섯 괴물, 게, 딱정벌레,
골렘, 임프, 도깨비불, 해파리, 식인 식물, 미믹, 벌, 아기 드래곤, 올빼미, 펭귄, 토끼, 문어, 미라, 예티, 멧돼지, 피라냐, 모래 벌레, 전갈. 각각 3~6가지 색이 있습니다(`wolf-fox`, `golem-lava`, `mimic-gold`,
`baby-dragon-black`...). 그래서 다른 캐릭터처럼 모자를 쓰고, 걷고, 공격하고, 맞고, 레벨업하고, 쓰러집니다:
`spell.walk('golem', 'left')`, `spell.action({ body: 'mimic', hat: 'pirate' }, 'attack')`.

<img src="docs/img/monsters.png" alt="몬스터 31종이 이름과 함께 움직이는 모습" width="672">

### ⚔️ 상황 이펙트

캐릭터에게 **행동**을 시킬 수 있습니다. 이펙트는 알아서 제자리에 붙습니다. 베기는 무기 든 손에,
데미지 숫자와 "LV UP"은 모자 위에, 연기는 몸 위에 나옵니다. 속성을 고르면 이펙트 색이 바뀌고,
맞을 때는 캐릭터도 불타거나 얼거나 중독된 색으로 변합니다.

```js
const frames = spell.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire')
// 항상 32×32 이미지 8프레임, frames.fps 속도로 재생 → 스프라이트 시트에 바로 사용

spell.action('slime', 'hit', { element: 'ice', amount: '-12' })
spell.action('hero-mage', 'cast', '#00ffcc')      // 재질 이름이나 hex 색도 속성으로 쓸 수 있어요
```

**행동 6종**(`attack` 공격, `hit` 피격, `heal` 회복, `levelup` 레벨업, `cast` 시전, `death` 사망) ×
**속성 5종**(`fire` 불, `ice` 얼음, `poison` 독, `holy` 빛, `dark` 어둠)을 275만 가지 캐릭터 누구에게나 쓸 수 있습니다.

<img src="docs/img/actions.png" alt="모든 행동과 속성 조합 애니메이션" width="672">

공격 이펙트는 든 무기를 따라갑니다. 검은 베기, 단검은 찌르기, 창은 관통, 망치·도끼는 내려찍기, 활은 화살, 지팡이는 마법,
채찍은 휘두르기, 횃불은 불꽃, 꽃은 뿅망치, 맨손은 주먹. `spell.action.styleOf(spec)`로 확인하고 `{ style: 'whip' }`로 바꿀 수 있습니다.

### ✨ 이펙트 665종

**코드로만 그린 이펙트 110종**이 각각 최대 11가지 색, 원하는 크기로 나옵니다. 여기에 손으로 그린 폭발·반짝임·베기가 더해집니다.
폭발, 마법, 속성, 투사체와 빔, 끝없이 이어지는 날씨, 환경(용암, 안개, 햇살, 물결), 상태이상, 무기별 베기와 타격 피드백(POW, CRIT!, MISS, 막기, 패링),
보상과 UI 연출(체크, 느낌표, 3-2-1-GO 카운트다운), 그리고 큰 연출(운석, 토네이도, 블랙홀, 소환, 부활, 별똥 비, 용의 숨결, 꽃가루)까지 있습니다.
새로 들어온 것: 물기, 삼연 베기, 수리검, 돌 던지기, 총구 섬광, 육각 방벽, 생명력 흡수, 떠오르는 영혼, 저주, 가속, 감속, 성스러운 십자가,
얼음 가시, 덩굴, 출혈, 감전, 젖음, 재생, KO!, 방패 깨짐, 그리고 이어 붙일 수 있는 꽃잎, 재, 별하늘, 구름, 폭포.
[**이펙트 페이지**](https://olebangpad.github.io/pixspell/fx.html)에서 보고, 색을 바꾸고, 내려받을 수 있습니다.

<a href="https://olebangpad.github.io/pixspell/fx.html"><img src="docs/img/fx.png" alt="코드로 만든 모든 이펙트 애니메이션" width="100%"></a>

```js
spell.fx('meteor')                                   // 프레임 배열 (32×32), .fps와 .loop 포함
spell.fx('tornado', { element: 'fire', size: 64 })   // 11가지 색이나 hex, 어떤 크기든 선명하게
spell.fx('rain', { size: 64 })                       // 이음새 없는 타일: 맵 전체에 반복해서 깔기
spell.status('slime', 'frozen')                      // 상태이상이 걸린 캐릭터 (32×32)
spell.fx.sequence([{ fx: 'charge' }, { fx: 'comet', repeat: 2 }, { fx: 'boom', with: true, at: -2 }])
spell.fxPack(['meteor', 'poof', 'crit'])             // 시트 한 장 + Phaser/Aseprite JSON + Godot .tres
```

이펙트는 레시피입니다. 빛을 레이어에 칠하는 몇 줄의 코드를 엔진이 음영과 외곽선이 있는 도트로 바꿉니다
([`src/fx/`](src/fx), [추가하는 법](CONTRIBUTING.md#adding-an-effect)). 모든 레시피는 두 배 크기에서도 모양이 유지되는지 테스트합니다.

### 🔊 코드로 만든 효과음 103개

소리도 그림처럼 **파일이 아니라 레시피**입니다. 공격 방식과 행동마다 같은 이름의 소리가 있어서, 무기에 맞는 휘두르는 소리가 저절로 따라옵니다.
이펙트 색을 바꾸듯 **속성**을 더하고, 음높이를 바꾸고, 조금씩 다른 변형을 뽑아서 같은 타격음이 반복돼도 지루하지 않게 할 수 있어요.
[**효과음 페이지**](https://olebangpad.github.io/pixspell/sfx.html)에서 듣고 내려받을 수 있습니다.

```js
spell.sfx('coin').play()                                  // 브라우저 (첫 소리는 키 입력이나 클릭에서 시작하세요)
spell.sfx(spell.action.styleOf(hero)).play()                // 검 -> 'slash', 망치 -> 'smash', 활 -> 'shoot' ...
spell.sfx('hit', { element: 'ice', seed: 2, pitch: 1.2 }) // 속성 10가지, 변형, 원하는 음높이
spell.sfx(spell.sfx.forEffect('fx-meteor'))                 // 이펙트에 맞는 소리
await spell.sfx('levelup').save('levelup.wav')            // Node; .toWAV()로 어디서든 바이트로
spell.sfxPack(['slash', 'hit', 'coin']).zip()             // WAV 묶음 zip
```

UI 효과음(삐, 알림, 구매, 장착, 잠금 해제, 문, 스위치), 점프·발소리·오르기·수영·추락·튕김, 코인·보석·상자, 무기별 공격음,
물기·던지기·총소리·타격·크리티컬·막기·패링·칼 부딪힘·유리 깨짐, 마법(흡수, 저주, 가속, 감속, 방벽), 폭발·운석·지진,
생물 소리(포효, 찍찍, 쉭, 윙윙, 철퍽, 유령 울음), 속성 소리, 승리·패배·팡파르·비밀 발견 징글, 끊김 없이 반복되는
비·바람·모닥불·시냇물·용암·귀뚜라미·심장 박동 소리까지 있습니다. 소리가 나는 이펙트에는 모두 짝이 되는 효과음이 있습니다. 전부 `assets/sfx/`에 16비트 WAV로 들어 있고 CC0입니다.

### 🎵 코드로 만든 음악

칩튠 17곡: 타이틀, 마을, 필드, 숲, 던전, 동굴, 전투, 보스, 상점, 밤, 성, 사막, 설원, 바다용 루프와 `victory`, `level-clear`, `game-over`
징글입니다. 엔진이 곡 데이터 몇 줄(템포, 조성, 코드, 스타일)로 각 파트를 씁니다. 다시 돌아오는 훅과 으뜸음으로 끝나는 마무리가 있는
멜로디, 베이스, 아르페지오나 패드, 드럼을 효과음과 같은 소리로 연주합니다. [**소리 페이지**](https://olebangpad.github.io/pixspell/sfx.html#music-grid)에서 들어 보세요.

```js
const music = spell.music('town').play()             // music.stop() 할 때까지 반복
spell.music('battle', { tempo: 1.1, key: 2 })        // 더 빠르게, 두 반음 높게
spell.music('dungeon', { seed: 1 })                  // 같은 분위기, 다른 멜로디
await spell.music('boss').save('boss.wav')           // Node, 또는: npx pixspell music boss
```

### 🚶 8방향 걷기

사람형 캐릭터는 앞·뒤·옆 모습이 따로 그려져 있고, 장비도 방향에 맞게 바뀝니다
(뒤에서 보면 무기가 반대 손에, 옆에서 보면 방패가 몸 뒤로). 대각선은 앞·뒤 모습의 머리와 어깨를 옆으로 돌린 3/4 모습이고,
모자도 같이 돌아갑니다. 동물과 몬스터는 통통 뛰거나 떠다닙니다. 왼쪽 방향은 오른쪽 방향의 좌우 반전입니다.

```js
spell.walk({ body: 'heroine', hat: 'wizard', hand: 'staff' }, 'left')   // 24×24 프레임, .fps
spell.walk(knight, 'down-right')                                       // down-left, up-right, up-left도 있음
spell.pack(knight, { diagonals: true })                                // 8방향 걷기가 모두 들어간 게임 팩
```

<img src="docs/img/walk.png" alt="캐릭터 6명이 8방향으로 걷는 모습" width="630">

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

<img src="docs/img/world.png" alt="PixSpell 타일과 소품만으로 만든 마을과 던전, 걷는 마법사와 기사" width="672">

**세계 하나를 통째로:** 모든 픽셀이 PixSpell 스프라이트인 마을과 던전 방입니다. 문, 창문, 지붕, 울타리, 우물, 가로등,
나무통, 상자, 자루, 침대, 탁자, 의자, 책장, 가마솥, 모루, 깃발, 텐트, 벽 횃불, 기둥, 가시 함정, 계단, 거미줄, 뼈, 묘비,
광차와 레일, 선인장, 전나무, 큰 버섯, 수정, 연잎, 그리고 이어 붙일 수 있는 자갈길, 지붕 기와, 카펫, 체크 바닥, 다리,
흐르는 용암까지. 모두 재질 변형이 있습니다(`door-iron`, `roof-slate`, `lava-toxic`, `crystals-amethyst`...).

7개 카테고리, 기본 234종, 변형 포함 **887가지**, 이 중 64종은 애니메이션입니다. 아이템도 단검, 창, 망치, 지팡이, 갑옷, 장화, 목걸이, 빵, 치즈, 케이크, 당근, 달걀, 포도, 금괴, 트로피, 지도, 나침반, 모래시계, 편지, 룬 등 26종이 늘었습니다.
캐릭터, 착용 장비, 무기, 방어구, 포션, 보석, 음식, 몬스터, 이어 붙일 수 있는 타일, 소품, UI 아이콘, 말풍선 이모트,
이펙트(폭발, 반짝임, 연기, 타격, 베기)가 들어 있습니다. 여기에 [코드로 만든 이펙트 110종](#-이펙트-665종)이
애니메이션 525가지를 더하고, 이것도 전부 `assets/`에 PNG로 들어 있습니다.

<img src="docs/img/gallery.png" alt="PixSpell의 모든 기본 스프라이트" width="100%">

### 🪟 UI 키트

<img src="docs/img/ui.png" alt="PixSpell로 만든 게임 UI: 하트, 체력·마나·경험치 바, 버튼이 있는 대화 창, 아이템 칸 인벤토리, 아이콘 버튼" width="720">

패널, 인벤토리 칸, 버튼은 테두리를 그대로 둔 채 원하는 크기로 늘어납니다: `spell('panel').nineSlice(160, 64)`.
32×8 `bar`는 체력, 마나, 경험치, 기력, 보호막, 빈 바가 있고, 하트·별·체크·자물쇠 옆에 설정, 소리 켜기·끄기, 일시정지, 재생,
홈, 메뉴, 더하기, 빼기, 화살표 아이콘이 있습니다. 위 화면 전체가 [`scripts/build.js`의 30줄 정도](scripts/build.js)입니다.

```js
const dialog = spell('panel').nineSlice(160, 64)                                   // 모서리는 그대로 선명하게
const hpBar = spell('bar-empty').draw(spell('bar').crop(0, 0, 1 + Math.round(30 * hp), 8), 0, 0)
```

## 📦 PNG만 필요하다면

**원하는 비트(타일 크기)를 골라 전부 zip 하나로 받으세요:** [**다운로드 페이지**](https://olebangpad.github.io/pixspell/#download).
8×8, 16×16, 32×32, 64×64 중에 고르면 스프라이트, 걷기 스트립이 있는 캐릭터, 이펙트, 효과음이 그 크기에 맞춰 나옵니다.

| 타일 | 만드는 방법 |
| --- | --- |
| **8×8** (8비트 느낌) | 반으로 줄인 뒤 1픽셀 외곽선을 다시 그림 (눈, 이음선 같은 디테일은 유지) |
| **16×16** | 원본 그대로 |
| **32×32** · **64×64** | Scale2x를 한두 번: 픽셀이 뚱뚱해지는 확대가 아니라 계단이 둥글게, 그 크기로 그린 것처럼 |
| 이펙트 | 레시피로 그 크기에 맞게 새로 그림 (64×64 타일이면 진짜 128픽셀 이펙트) |

<img src="docs/img/grids.png" alt="같은 스프라이트, 캐릭터, 이펙트를 8, 16, 32, 64픽셀 타일로" width="100%">

코드에서는 옵션 하나입니다: `spell('sword', { grid: 32 })`, `spell.char(spec, { grid: 8 })`, `spell.pack(spec, { grid: 64 })`.
명령어로는 `node scripts/pixspell.js export --grid 32` 하면 `pixspell-32px.zip`이 만들어집니다.

16픽셀 원본은 [`assets/`](assets) 폴더에도 미리 뽑아 두었습니다. 빌드할 필요가 없습니다.

| 폴더 | 내용 |
| --- | --- |
| `assets/png/` | 모든 스프라이트 16×16 (예: `potion-mana.png`) |
| `assets/png@4x/` | 같은 이미지 64×64 |
| `assets/anim/` | 애니메이션 PNG (4배) |
| `assets/strips/` | 게임 엔진용 가로 프레임 스트립 (1배) |
| `assets/walk/` | 모든 몸의 8방향 걷기 스트립 |
| `assets/sfx/` | 모든 효과음 (16비트 모노 WAV) |
| `assets/atlas.png` + `atlas.json` | 모든 프레임이 들어간 텍스처 아틀라스 (TexturePacker JSON 형식: `this.load.atlas('pixspell', 'atlas.png', 'atlas.json')`) |

모든 그림은 **CC0**입니다. 상업용 게임에도 출처 표기 없이 쓸 수 있습니다 (표기해 주시면 감사합니다 ❤).

## 💻 코드에서 쓰기

**브라우저** (설치 없이 jsDelivr로 GitHub에서 바로):

```html
<script type="module">
  import { spell, compose } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'

  const king = compose(spell('hero'), spell('crown').at(0, -7)).scale(8)
  document.body.append(king.toCanvas())
</script>
```

**npm** (Node 18 이상, 번들러, TypeScript 타입 포함):

```bash
npm i pixspell
npx pixspell render potion -A '#ff4fd8' --scale 8 -o potion.png   # CLI도 같이 설치됩니다
```

```js
import { spell, compose, sheet } from 'pixspell'

await spell('sword', { A: 'gold', C: 'red' }).scale(4).save('gold-sword.png')

const frames = spell.frames('slime-blue')            // 애니메이션 모든 프레임
await sheet(frames).image.scale(4).save('slime-sheet.png')
```

ES 모듈 전용입니다(`require` 불가). 모든 기능이 `spell` 하나에 들어 있습니다(예전 이름 `dog`도 그대로 동작합니다). 버전은 semver를 따르고, 1.0 전까지는 마이너 버전에서 API가 바뀔 수 있으며 [변경 기록](CHANGELOG.md)에 적습니다.
레포를 받아서 `./src/index.js`를 바로 가져와도 됩니다. 설치할 것 없음.

**CLI** (설치 후 `npx pixspell ...`, 레포에서는 `node scripts/pixspell.js ...`):

```bash
node scripts/pixspell.js list monsters
node scripts/pixspell.js render potion -A '#ff4fd8' --scale 8 --outline '#fff' -o potion.png
node scripts/pixspell.js render explosion --anim --scale 4 -o boom.png      # 애니메이션 PNG
node scripts/pixspell.js combine hero crown@0,-7 --scale 6 -o king.png
node scripts/pixspell.js char hero-elf --hat wizard --hand staff-fire -A purple --scale 6 -o mage.png
node scripts/pixspell.js char --random 42 --scale 6 -o npc.png
node scripts/pixspell.js char hero --hand sword --action attack --element fire --anim --scale 4 -o slash.png
node scripts/pixspell.js char heroine --hat cowboy --hand rod --walk left --anim --scale 4 -o walk.png
node scripts/pixspell.js fx meteor --element ice --size 64 -o meteor.png      # 아무 이펙트, 색, 크기
node scripts/pixspell.js fx burning --on slime --strip -o burning.png        # 캐릭터에 상태이상
node scripts/pixspell.js fxpack meteor poof crit -o effects.zip              # 이펙트 게임 팩
node scripts/pixspell.js sfx slash --element fire -o slash.wav              # 효과음 (pixspell.js sfx만 치면 목록)
node scripts/pixspell.js sfxpack -o sounds.zip                              # 전체 효과음 WAV
node scripts/pixspell.js export --grid 32                                   # 32x32 타일용 전체를 zip 하나로
node scripts/pixspell.js char hero --hat crown --walk left --grid 64 -o w.png  # --grid는 render, char, fx, pack에 다 됨
node scripts/pixspell.js hero octocat -o hero.png                         # GitHub 계정을 게임 영웅 카드로
node scripts/pixspell.js skill                                              # 코딩 에이전트에 스킬 설치
```

TypeScript와 에디터 자동완성: 타입이 [`src/index.d.ts`](src/index.d.ts)에 들어 있습니다.

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
| `spell(id, { A, B, C, frame })` | 스프라이트 렌더링. `A/B/C`에는 재질 이름, hex 색, 4색 배열 |
| `spell.frames(id, opts)` | 애니메이션 전체 프레임 |
| `spell.list({ category, tag, variants })` | 전체 id 목록 |
| `spell.char(body, { hat, hand, offhand, A })` | 장비를 이름으로 입힌 24×24 캐릭터 |
| `spell.char.frames(spec)` · `spell.char.random(seed)` | 애니메이션 프레임 · 시드로 재현되는 랜덤 캐릭터 |
| `spell.walk(spec, dir)` | 걷기 `down` `up` `left` `right` (24×24 프레임, `.fps`) |
| `spell.action(spec, name, element)` | 행동 애니메이션 8프레임 (32×32, `.fps`) |
| `spell.fx(name, { element, size, seed, light })` | 코드로 만든 이펙트: `.fps`, `.loop`가 붙은 프레임 배열, 은은하게 빛남(`light: false`면 빛 없음). 전체 이름은 `spell.fx.list` |
| `spell.fx.sequence(steps)` | 이펙트를 이어 붙이거나 겹쳐서 하나의 애니메이션으로 |
| `spell.status(spec, effect, { walk })` | 상태이상이 걸린 캐릭터 (32×32 프레임) |
| `spell.pack(spec)` · `spell.fxPack(names)` | 게임 팩: 시트 + Aseprite/Phaser JSON + Godot `.tres`, `.zip()`으로 한 파일 |
| `spell.sfx(name, { element, pitch, seed })` | 효과음: `.play()`, `.toWAV()`, `.save(path)`. 목록은 `spell.sfx.list`, 이펙트 소리는 `spell.sfx.forEffect(fx)` |
| `spell.sfxPack(names)` | 효과음 WAV 묶음 zip |
| `spell.music(name, { key, tempo, seed })` | 칩튠 음악: 끊김 없이 반복되는 루프나 짧은 징글(Sound). 목록은 `spell.music.list`, 정보는 `spell.music.info(name)` |
| `{ grid: 8 \| 16 \| 32 \| 64 }` | 위 모든 호출에 붙는 옵션: 그 타일 크기용 그림 (`smooth: false`면 단순 확대) |
| `spell.toGrid(img, grid)` · `spell.bundle({ grid })` | 아무 PixSpell 이미지나 변환 · 한 타일 크기의 전체 파일 목록 |
| `compose(...layers)` | 레이어 합성, `.at(x, y)`로 위치 지정 |
| `sheet(images, { columns, gap })` | 스프라이트 시트로 묶기 |
| `text('SCORE 9', { color })` | 내장 3×5 도트 폰트 |

크기: `.scale(n)` `.smooth()` `.resize(w, h)` `.downscale(k)` `.pad()` `.crop()` `.trim()` `.nineSlice(w, h)`(패널을 테두리 그대로 늘리기)<br>
색: `.hue()` `.adjust()` `.swap()` `.quantize()` `.tint()` `.grayscale()`<br>
효과/출력: `.outline()` `.shadow()` `.silhouette()` `.flipX()` `.flipY()` `.rotate()` `.toPNG()` `.toCanvas()` `.save()`

재질: `red orange gold lime green mint ice blue purple pink wood leather skin sand iron stone bone shadow`

## 🤝 기여하기

새 스프라이트 추가가 가장 반가운 기여입니다. 2분이면 됩니다.

1. [플레이그라운드](https://olebangpad.github.io/pixspell/) → **Edit pixels** → 그리기 → **Copy sprite definition**
2. [`src/sprites/`](src/sprites)의 알맞은 파일에 붙여넣고 `variants` 몇 개 추가
3. `npm run check && npm run build` 후 PR

스타일 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다. 원하는 스프라이트를 이슈로 요청해도 좋습니다.

## 🙏 크레딧

- 32·64픽셀 타일의 매끄러운 확대는 Andrea Mazzoleni가 EPX 알고리즘을 다듬은 **Scale2x**입니다 ([scale2x.it](https://www.scale2x.it/)).
- 효과음 엔진은 DrPetter의 **sfxr** 아이디어를 빌렸습니다: 게임 효과음은 녹음이 아니라 숫자 몇 개라는 것.
- 웹사이트와 홍보 영상에는 Jason Kottke의 **Silkscreen** 폰트를 씁니다.
- 이 레포의 모든 스프라이트, 이펙트, 효과음은 PixSpell을 위해 새로 그리고 만든 것입니다.

## 📄 라이선스

- **PixSpell이 그리거나 내는 모든 것** (스프라이트 그림, 라이브러리가 만드는 모든 이미지·이펙트·효과음, 크기와 상관없이): [CC0 1.0](LICENSE-ASSETS), 퍼블릭 도메인. 상업용 게임에도 출처 표시 없이 쓸 수 있습니다
- **코드**: [MIT](LICENSE)

그림 그리는 시간을 아껴 드렸다면 ⭐ 하나가 다른 개발자들이 이 프로젝트를 찾는 데 큰 도움이 됩니다.
