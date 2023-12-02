export enum ActivityGame {
  AngryBirds = 'angry_birds',
  Basketball = 'basketball',
  CarRacing = 'car_racing',
  EscapeRoom = 'escape_room',
  SlidePuzzle = 'slide_puzzle',
}

export enum ActivityCategoryType {
  Point = 'point',
  Time = 'time',
  Stage = 'stage',
}

export enum ActivityCategoryLevel {
  Easy = 1,
  Average,
  Difficult,
}

export const activityGameType = {
  [ActivityGame.AngryBirds]: {
    name: ActivityGame.AngryBirds,
    type: ActivityCategoryType.Point,
  },
  [ActivityGame.Basketball]: {
    name: ActivityGame.Basketball,
    type: ActivityCategoryType.Point,
  },
  [ActivityGame.CarRacing]: {
    name: ActivityGame.CarRacing,
    type: ActivityCategoryType.Time,
  },
  [ActivityGame.EscapeRoom]: {
    name: ActivityGame.EscapeRoom,
    type: ActivityCategoryType.Stage,
  },
  [ActivityGame.SlidePuzzle]: {
    name: ActivityGame.SlidePuzzle,
    type: ActivityCategoryType.Stage,
  },
};
