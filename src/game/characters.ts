export type SkillId =
  | "timing-hit"
  | "rage-smash"
  | "wall-receive"
  | "fake-shot"
  | "random-bounce"
  | "double-jump";

export type CharacterDefinition = {
  id: string;
  name: string;
  trait: string;
  description: string;
  detail: string;
  difficulty: "Easy" | "Medium" | "Hard";
  skill: {
    id: SkillId;
    name: string;
  };
  stats: {
    speed: 1 | 2 | 3 | 4 | 5;
    power: 1 | 2 | 3 | 4 | 5;
    jump: 1 | 2 | 3 | 4 | 5;
    defense: 1 | 2 | 3 | 4 | 5;
    trick: 1 | 2 | 3 | 4 | 5;
  };
  primary: number;
  secondary: number;
  accent: number;
  hair: number;
  accessory: "glasses" | "anger" | "munch" | "genius" | "spark" | "spin";
  assetKey?: string;
};

export const CHARACTER_FRAME_SIZE = 64;

export const characters: CharacterDefinition[] = [
  {
    id: "mc-grasshopper",
    name: "MC 메뚜기",
    trait: "국민 MC형",
    description: "큰 동그란 안경과 과장된 미소가 먼저 보이는 빠른 리더형 캐릭터.",
    detail:
      "슬림한 2등신 체형에 초록 재킷, 하얀 셔츠, 밝은 볼터치를 더했습니다. 몸짓은 가볍고 친근하게, 표정은 예능 진행자처럼 크게 웃도록 잡았습니다.",
    difficulty: "Easy",
    skill: { id: "timing-hit", name: "타이밍 히트" },
    stats: { speed: 4, power: 3, jump: 3, defense: 3, trick: 3 },
    primary: 0x3fbf62,
    secondary: 0xf7f4df,
    accent: 0xf2cc4d,
    hair: 0x2d241f,
    accessory: "glasses",
  },
  {
    id: "angry-uncle",
    name: "버럭 아저씨",
    trait: "버럭 개그형",
    description: "찡그린 눈썹과 짧고 강한 동작으로 한 방을 노리는 공격형 캐릭터.",
    detail:
      "짙은 남색 의상과 빨간 분노 마크로 코믹한 버럭 에너지를 살렸습니다. 이동은 느리지만 공을 때릴 때는 직선으로 묵직하게 꽂습니다.",
    difficulty: "Medium",
    skill: { id: "rage-smash", name: "분노 스매시" },
    stats: { speed: 2, power: 5, jump: 2, defense: 2, trick: 2 },
    primary: 0x263a68,
    secondary: 0x6b7280,
    accent: 0xff4a38,
    hair: 0x202026,
    accessory: "anger",
  },
  {
    id: "one-ton-tank",
    name: "1톤탱크",
    trait: "먹방 탱커형",
    description: "둥근 얼굴과 큰 몸집으로 코트를 든든하게 막는 수비형 캐릭터.",
    detail:
      "넓은 몸통, 따뜻한 주황색 의상, 커다란 손동작으로 안정감을 줬습니다. 움직임은 느리지만 히트박스가 넓어 초보자가 쓰기 좋습니다.",
    difficulty: "Easy",
    skill: { id: "wall-receive", name: "벽 리시브" },
    stats: { speed: 1, power: 4, jump: 2, defense: 5, trick: 1 },
    primary: 0xf28c32,
    secondary: 0xfff0c8,
    accent: 0xb75a32,
    hair: 0x4b3428,
    accessory: "munch",
  },
  {
    id: "chubby-doni",
    name: "뚱뚱한도니",
    trait: "전략 예능형",
    description: "무표정으로 서 있다가 갑자기 웃으며 공의 타이밍을 비트는 전략형 캐릭터.",
    detail:
      "보라색과 청록색 조합으로 약간 엉뚱한 분위기를 만들었습니다. 평소에는 담담하지만 스킬 순간에는 표정이 확 바뀌는 느낌입니다.",
    difficulty: "Hard",
    skill: { id: "fake-shot", name: "페이크 샷" },
    stats: { speed: 3, power: 2, jump: 3, defense: 3, trick: 5 },
    primary: 0x7a4fc2,
    secondary: 0x2eb8a6,
    accent: 0xffffff,
    hair: 0x342a3a,
    accessory: "genius",
  },
  {
    id: "crazy-yellow-hair",
    name: "미친 노랑머리",
    trait: "광기 변칙형",
    description: "노란 머리와 과장된 눈빛으로 예측하기 어려운 바운드를 만드는 트릭형 캐릭터.",
    detail:
      "핑크 의상과 형광 포인트, 삐죽한 노란 머리로 하이텐션을 강조했습니다. 움직임은 튀고, 공 궤적도 한 박자 이상하게 꺾입니다.",
    difficulty: "Hard",
    skill: { id: "random-bounce", name: "랜덤 바운스" },
    stats: { speed: 5, power: 3, jump: 3, defense: 1, trick: 5 },
    primary: 0xf05fa8,
    secondary: 0x22212a,
    accent: 0x8cff5a,
    hair: 0xdcc15f,
    accessory: "spin",
  },
  {
    id: "short-uncle",
    name: "키작은 아저씨",
    trait: "장난꾸러기형",
    description: "작은 히트박스와 빠른 방향 전환으로 빈틈을 파고드는 회피형 캐릭터.",
    detail:
      "작은 체형, 빨간 셔츠, 노란 포인트로 장난스러운 이미지를 살렸습니다. 공격력은 낮지만 공중에서 한 번 더 튀어 오를 수 있습니다.",
    difficulty: "Medium",
    skill: { id: "double-jump", name: "더블 점프" },
    stats: { speed: 5, power: 2, jump: 4, defense: 2, trick: 4 },
    primary: 0xe94338,
    secondary: 0xffd348,
    accent: 0x1f2428,
    hair: 0x2d2520,
    accessory: "spark",
  },
];

export function getCharacter(id: string): CharacterDefinition {
  return characters.find((character) => character.id === id) ?? characters[0];
}
