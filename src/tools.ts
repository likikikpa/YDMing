import type { Tool } from "./types";

/** What each tool does, shown in tooltips and next to the tool settings. */
export const toolDescriptions: Record<Tool, string> = {
  select:
    "Click an object to select it. Drag to move it, use the handles to resize or rotate, drag a box to pick several. Double-click a settlement to open its map.",
  hand: "Drag to move around the map. Holding Space does the same with any tool.",
  brush:
    "Paint freehand colour on the Paint layer. [ and ] change the brush size.",
  pencil: "Draw a thin, hard-edged line with square ends.",
  eraser:
    "Rub out painted strokes on the active layer. Terrain and objects stay untouched.",
  fill: "Fill a connected area of the active layer with the chosen colour.",
  line: "Drag to draw a straight line.",
  rectangle: "Drag to draw a rectangle outline.",
  ellipse: "Drag to draw an ellipse outline.",
  text: "Click the map to add a label, then rename it in the side panel.",
  eyedropper:
    "Click the map to pick up the colour under the cursor. Alt-click does this with any tool.",
  raise:
    "Raise the land like a mountain. Hold and drag: the longer you stay, the higher it grows. Ground rising above the sea line becomes dry land.",
  dig: "Lower the land with a shovel. Dig below the sea line to carve lakes, bays and channels.",
  smooth: "Softens sharp peaks and pits so slopes blend into each other.",
  flatten:
    "Levels the ground to the height where you first click. Good for plains and plateaus.",
  roughen: "Adds bumps and crags for rocky, broken ground.",
  biome:
    "Repaint the climate zone (forest, desert, snow…) under the brush. Choose the biome in the side panel.",
  stamp:
    "Place symbols from the library: trees, buildings, markers. Drag to scatter trees.",
  river:
    "Click on land: a river runs downhill from that spot to the sea or a lake.",
  ridge:
    "Drag a line to raise a whole mountain range along it. Brush size sets the width, strength sets the height.",
  island: "Drag a box to raise a new island with a natural, ragged coast.",
  road: "Drag to draw a road. The line is smoothed when you let go.",
  wall: "Drag to draw a wall. Good for cities and fortresses.",
  room: "Drag a rectangle to carve a new dungeon room. Rooms are numbered and keyed automatically.",
};

export const toolDescriptionsRu: Record<string, string> = {
  [toolDescriptions.select]:
    "Нажмите на объект, чтобы выделить его. Перетаскивайте, меняйте размер и поворот за маркеры, рамкой выберите несколько. Двойной щелчок по поселению открывает его карту.",
  [toolDescriptions.hand]:
    "Перетаскивайте, чтобы двигать карту. Пробел делает то же с любым инструментом.",
  [toolDescriptions.brush]:
    "Рисуйте цветом на слое «Paint». Клавиши [ и ] меняют размер кисти.",
  [toolDescriptions.pencil]: "Тонкая линия с чёткими краями.",
  [toolDescriptions.eraser]:
    "Стирает мазки активного слоя. Рельеф и объекты не затрагиваются.",
  [toolDescriptions.fill]:
    "Заливает выбранным цветом связную область активного слоя.",
  [toolDescriptions.line]: "Перетащите, чтобы провести прямую линию.",
  [toolDescriptions.rectangle]: "Перетащите, чтобы нарисовать прямоугольник.",
  [toolDescriptions.ellipse]: "Перетащите, чтобы нарисовать эллипс.",
  [toolDescriptions.text]:
    "Нажмите на карту, чтобы добавить подпись, и переименуйте её в боковой панели.",
  [toolDescriptions.eyedropper]:
    "Нажмите на карту, чтобы взять цвет. Alt+клик работает с любым инструментом.",
  [toolDescriptions.raise]:
    "Поднимает землю, как гору. Зажмите и ведите: чем дольше держите, тем выше. Выше уровня моря появляется суша.",
  [toolDescriptions.dig]:
    "Лопата понижает землю. Копайте ниже уровня моря, чтобы создавать озёра, заливы и проливы.",
  [toolDescriptions.smooth]: "Сглаживает острые пики и ямы.",
  [toolDescriptions.flatten]:
    "Выравнивает землю до высоты в точке первого нажатия. Для равнин и плато.",
  [toolDescriptions.roughen]: "Добавляет бугры и скалы.",
  [toolDescriptions.biome]:
    "Перекрашивает климатическую зону (лес, пустыня, снег…) под кистью. Биом выбирается в боковой панели.",
  [toolDescriptions.stamp]:
    "Ставит символы из библиотеки: деревья, здания, метки. Деревья можно «рассыпать», ведя мышь.",
  [toolDescriptions.river]:
    "Нажмите на сушу: река потечёт вниз от этой точки к морю или озеру.",
  [toolDescriptions.ridge]:
    "Проведите линию, чтобы поднять горную цепь. Размер кисти задаёт ширину, сила — высоту.",
  [toolDescriptions.island]:
    "Перетащите рамку, чтобы поднять остров с естественным берегом.",
  [toolDescriptions.road]:
    "Ведите мышь, чтобы нарисовать дорогу. После отпускания линия сглаживается.",
  [toolDescriptions.wall]: "Ведите мышь, чтобы нарисовать стену.",
  [toolDescriptions.room]:
    "Перетащите прямоугольник, чтобы вырезать комнату подземелья. Комнаты нумеруются сами.",
};
