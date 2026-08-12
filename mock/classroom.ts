/**
 * 文件头：mock 示例课堂数据
 *
 * 对应原项目：无直接对应文件（原项目课堂数据由「生成管线」产出）。
 * 数据形状对照：packages/@openmaic/dsl 的 Stage/Scene/Slide/Quiz 类型。
 *
 * 范围说明（2026-08-11 更新）：
 *   - 教学动作：speech / spotlight / laser；
 *   - slide 元素：仅 text / shape / line / image（已移除 latex 元素示例）。
 *
 */
import type { Scene, Stage } from '#/types/stage'
import type { Action } from '#/types/action'

/** 示例课程 id（课堂页路由 /classroom/demo 使用） */
export const MOCK_CLASSROOM_ID = 'demo'

/** 课程元信息（Stage） */
export const mockClassroomStage: Stage = {
  id: MOCK_CLASSROOM_ID,
  name: '光合作用',
  description: 'mock 示例课程：覆盖 slide / quiz / interactive 三种场景',
  languageDirective: '用中文授课',
  style: 'interactive',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  agentIds: ['default-1'],
}

/** 第一页：封面幻灯片（文字 + 图片 + 线条箭头），演示 speech / spotlight / laser 动作 */
const slide1Actions: Action[] = [
  { id: 'a1', type: 'speech', text: '同学们好，今天我们来学习光合作用。', audioUrl: '/audio/a1.mp3' },
  { id: 'a2', type: 'spotlight', elementId: 'img_leaf', dimOpacity: 0.5 },
  { id: 'a3', type: 'laser', elementId: 'txt_title', color: '#ff0000' },
  { id: 'a4', type: 'speech', text: '请看标题与这张图，这是光合作用。', audioUrl: '/audio/a4.mp3' },
]

/** 第二页：随堂测验（单选 + 多选 + 简答） */
const quizActions: Action[] = [
  { id: 'b1', type: 'speech', text: '现在让我们做一个随堂测验，检验一下学习成果。', audioUrl: '/audio/b1.mp3' },
]

/** 第三页：交互模拟实验（iframe HTML） */
const interactiveActions: Action[] = [
  { id: 'c1', type: 'speech', text: '请拖动滑块，观察光照强度对光合速率的影响。', audioUrl: '/audio/c1.mp3' },
]

/** 第四页：光反应与暗反应总结 */
const slide2Actions: Action[] = [
  { id: 'd2', type: 'laser', elementId: 'txt_summary', color: '#ff0000' },
  { id: 'd1', type: 'speech', text: '总结一下：光反应在类囊体薄膜，暗反应在基质。', audioUrl: '/audio/d1.mp3' },
]

/** 第五页：光反应阶段（2026-08-12 新增验收素材：长逐字稿 + 聚光/激光交替） */
const slide3Actions: Action[] = [
  {
    id: 's1',
    type: 'speech',
    text: '接下来我们把光合作用拆成两个阶段来学习。第一个阶段叫光反应，它发生在叶绿体的类囊体薄膜上。请你先记住这个位置。',
    audioUrl: '/audio/s1.mp3',
  },
  { id: 's1a', type: 'spotlight', elementId: 'img_chloro', dimOpacity: 0.5 },
  {
    id: 's2',
    type: 'speech',
    text: '这是叶绿体的结构示意图。绿色的小圆盘就是类囊体，许多类囊体叠在一起就构成了基粒。光反应就发生在这些薄膜上面。',
    audioUrl: '/audio/s2.mp3',
  },
  { id: 's2a', type: 'laser', elementId: 'shape_thylakoid', color: '#ff0000' },
  {
    id: 's3',
    type: 'speech',
    text: '光反应的第一步是水的光解。水分子在光能的作用下分解成氧气、氢离子和电子。我们呼吸的氧气，就来源于光合作用的这一步。',
    audioUrl: '/audio/s3.mp3',
  },
  { id: 's3a', type: 'laser', elementId: 'line_water', color: '#ff0000' },
  {
    id: 's4',
    type: 'speech',
    text: '与此同时，光能还会把二磷酸腺苷和磷酸合成三磷酸腺苷，也就是ATP，同时把氧化型辅酶二还原成还原型辅酶二，也就是NADPH。',
    audioUrl: '/audio/s4.mp3',
  },
  { id: 's4a', type: 'spotlight', elementId: 'txt_light_rxn', dimOpacity: 0.55 },
  {
    id: 's5',
    type: 'speech',
    text: '请记住光反应的两大产物：ATP和NADPH，它们会被送到暗反应中使用。',
    audioUrl: '/audio/s5.mp3',
  },
  { id: 's5a', type: 'spotlight', elementId: 'txt_title3', dimOpacity: 0.5 },
]

/** 第六页：暗反应阶段（2026-08-12 新增验收素材） */
const slide4Actions: Action[] = [
  {
    id: 's6',
    type: 'speech',
    text: '第二个阶段叫做暗反应，它发生在叶绿体的基质中。暗反应不需要光，但需要光反应提供的ATP和NADPH。',
    audioUrl: '/audio/s6.mp3',
  },
  { id: 's6a', type: 'spotlight', elementId: 'img_stroma', dimOpacity: 0.5 },
  {
    id: 's7',
    type: 'speech',
    text: '暗反应的第一步是二氧化碳的固定。一个二氧化碳分子与五碳化合物结合，生成两个三碳化合物。',
    audioUrl: '/audio/s7.mp3',
  },
  { id: 's7a', type: 'laser', elementId: 'txt_dark_rxn', color: '#ff0000' },
  {
    id: 's8',
    type: 'speech',
    text: '暗反应的第二步是三碳化合物的还原。ATP和NADPH把三碳化合物还原成三碳糖，三碳糖进一步合成葡萄糖等有机物。',
    audioUrl: '/audio/s8.mp3',
  },
  { id: 's8a', type: 'laser', elementId: 'line_co2', color: '#ff0000' },
  {
    id: 's9',
    type: 'speech',
    text: '最后总结一下：光合作用的总反应式是二氧化碳和水，在光能的作用下生成有机物和氧气。光反应提供能量，暗反应合成有机物。',
    audioUrl: '/audio/s9.mp3',
  },
  { id: 's9a', type: 'spotlight', elementId: 'txt_title4', dimOpacity: 0.5 },
]

/** 第七页：进阶随堂测验（2026-08-12 新增验收素材：两道引导 speech） */
const quiz2Actions: Action[] = [
  {
    id: 's10',
    type: 'speech',
    text: '进入测验环节，一共四道题目。前两道是单选题，第三道是多选题，最后一道是简答题，请认真作答。',
    audioUrl: '/audio/s10.mp3',
  },
  {
    id: 's11',
    type: 'speech',
    text: '如果你答错了也没有关系，答题结束之后会给出参考答案，帮助你巩固今天学习的知识点。',
    audioUrl: '/audio/s11.mp3',
  },
]

/** 第八页：二氧化碳浓度模拟实验（2026-08-12 新增验收素材） */
// const interactive2Actions: Action[] = [
//   {
//     id: 's12',
//     type: 'speech',
//     text: '再来做一个模拟实验。这次我们固定光照强度，调节二氧化碳的浓度，观察光合速率会发生怎样的变化。',
//     audioUrl: '/audio/s12.mp3',
//   },
// ]

/** 内联 SVG 图片（data URI，无需网络即可显示） */
const leafSvgDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
      '<rect width="300" height="200" fill="#e8f4fd"/>' +
      '<ellipse cx="150" cy="100" rx="90" ry="55" fill="#7cb342"/>' +
      '<path d="M150 150 L150 50" stroke="#33691e" stroke-width="3"/>' +
      '<text x="150" y="185" font-size="14" text-anchor="middle" fill="#1a5276">叶绿体</text>' +
      '</svg>',
  )

/** 新增验收素材：叶绿体结构示意图（类囊体堆叠） */
const chloroplastSvgDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="240">' +
      '<rect width="340" height="240" fill="#f0faf4"/>' +
      '<ellipse cx="150" cy="120" rx="120" ry="80" fill="#a5d6a7" stroke="#2e7d32" stroke-width="2"/>' +
      '<rect x="90" y="60" width="120" height="10" rx="5" fill="#66bb6a"/>' +
      '<rect x="90" y="78" width="120" height="10" rx="5" fill="#66bb6a"/>' +
      '<rect x="90" y="96" width="120" height="10" rx="5" fill="#66bb6a"/>' +
      '<rect x="90" y="114" width="120" height="10" rx="5" fill="#66bb6a"/>' +
      '<text x="150" y="215" font-size="16" text-anchor="middle" fill="#1b5e20">类囊体堆叠（基粒）</text>' +
      '</svg>',
  )

/** 新增验收素材：叶绿体基质示意图 */
const stromaSvgDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="240">' +
      '<rect width="340" height="240" fill="#fff8e1"/>' +
      '<ellipse cx="170" cy="120" rx="130" ry="90" fill="#ffe082" stroke="#f9a825" stroke-width="2"/>' +
      '<circle cx="120" cy="90" r="18" fill="#8d6e63"/>' +
      '<circle cx="210" cy="150" r="14" fill="#8d6e63"/>' +
      '<circle cx="240" cy="80" r="10" fill="#8d6e63"/>' +
      '<text x="170" y="215" font-size="16" text-anchor="middle" fill="#795548">基质（暗反应场所）</text>' +
      '</svg>',
  )

/** 全部场景（Scene[]） */
export const mockClassroomScenes: Scene[] = [
  {
    id: 'scene-slide-1',
    stageId: MOCK_CLASSROOM_ID,
    title: '什么是光合作用',
    order: 1,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas-slide-1',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#ffffff',
          themeColors: ['#5b9bd5', '#ed7d31'],
          fontColor: '#333333',
          fontName: 'Microsoft YaHei',
        },
        background: {
          type: 'gradient',
          gradient: {
            type: 'linear',
            colors: [
              { pos: 0, color: '#e8f4fd' },
              { pos: 100, color: '#ffffff' },
            ],
            rotate: 135,
          },
        },
        elements: [
          {
            id: 'txt_title',
            type: 'text',
            left: 200,
            top: 60,
            width: 600,
            height: 90,
            rotate: 0,
            content: "<span style='font-size:52px;font-weight:bold'>光合作用</span>",
            defaultColor: '#1a5276',
            defaultFontName: 'Microsoft YaHei',
          },
          {
            id: 'img_leaf',
            type: 'image',
            left: 60,
            top: 200,
            width: 300,
            height: 200,
            rotate: 0,
            fixedRatio: true,
            src: leafSvgDataUri,
          },
          {
            // 形状：圆形徽章（演示 shape 元素渲染；路径为 1000×1000 viewBox 中的圆）
            id: 'shape_circle',
            type: 'shape',
            left: 850,
            top: 60,
            width: 80,
            height: 80,
            rotate: 0,
            viewBox: [1000, 1000],
            path: 'M500 0 A500 500 0 1 1 499 0 Z',
            fixedRatio: true,
            fill: '#ed7d31',
          },
          {
            // 线条箭头：从标题下方指向图片（start/end 为画布绝对坐标，left/top 置 0）}s
            id: 'line_arrow',
            type: 'line',
            left: 0,
            top: 0,
            width: 3,
            start: [430, 180],
            end: [760, 260],
            style: 'solid',
            color: '#1a5276',
            points: ['', 'arrow'],
          },
        ],
      },
    },
    actions: slide1Actions,
  },
  {
    id: 'scene-quiz-1',
    stageId: MOCK_CLASSROOM_ID,
    title: '随堂测验',
    order: 2,
    type: 'quiz',
    content: {
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          type: 'single',
          question: '光合作用的场所是？',
          options: [
            { label: '线粒体', value: 'A' },
            { label: '叶绿体', value: 'B' },
            { label: '细胞核', value: 'C' },
          ],
          answer: ['B'],
        },
        {
          id: 'q2',
          type: 'multiple',
          question: '光反应的产物包括哪些？',
          options: [
            { label: 'ATP', value: 'A' },
            { label: 'NADPH', value: 'B' },
            { label: '葡萄糖', value: 'C' },
          ],
          answer: ['A', 'B'],
        },
        {
          id: 'q3',
          type: 'short_answer',
          question: '暗反应发生在叶绿体的哪个部位？',
          answer: ['叶绿体基质'],
        },
      ],
    },
    actions: quizActions,
  },
  {
    id: 'scene-interactive-1',
    stageId: MOCK_CLASSROOM_ID,
    title: '模拟实验：光照强度对光合速率的影响',
    order: 3,
    type: 'interactive',
    content: {
      type: 'interactive',
      url: '',
      html:
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' +
        'body{font-family:sans-serif;padding:24px;background:#f6f9fb;color:#222}' +
        'h2{font-size:18px}.row{margin:18px 0}.label{font-size:14px;margin-bottom:6px}' +
        '</style></head><body>' +
        '<h2>光合速率模拟</h2>' +
        '<div class="row"><div class="label">光照强度：<span id="val">50</span></div>' +
        '<input id="light" type="range" min="0" max="100" value="50" style="width:100%"></div>' +
        '<div class="row"><div class="label">当前光合速率：<span id="rate">50</span></div></div>' +
        '<script>' +
        'var input=document.getElementById("light");' +
        'function update(){var v=+input.value;document.getElementById("val").textContent=v;' +
        'document.getElementById("rate").textContent=Math.round(v*0.9);}' +
        'input.addEventListener("input",update);update();' +
        '</script></body></html>',
      widgetType: 'simulation',
      widgetConfig: {
        type: 'simulation',
        concept: '光合速率',
        variables: [{ name: 'light', label: '光照强度', min: 0, max: 100, default: 50 }],
      },
    },
    actions: interactiveActions,
  },
  {
    id: 'scene-slide-2',
    stageId: MOCK_CLASSROOM_ID,
    title: '光反应与暗反应',
    order: 4,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas-slide-2',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#ffffff',
          themeColors: ['#5b9bd5', '#ed7d31'],
          fontColor: '#333333',
          fontName: 'Microsoft YaHei',
        },
        elements: [
          {
            id: 'txt_summary',
            type: 'text',
            left: 150,
            top: 180,
            width: 700,
            height: 200,
            rotate: 0,
            content:
              "<div style='font-size:26px;line-height:1.6'>" +
              '光反应：类囊体薄膜<br/>暗反应：叶绿体基质<br/>' +
              "原料：CO₂ + H₂O → 产物：有机物 + O₂</div>",
            defaultColor: '#333333',
            defaultFontName: 'Microsoft YaHei',
          },
        ],
      },
    },
    actions: slide2Actions,
  },
  {
    id: 'scene-slide-3',
    stageId: MOCK_CLASSROOM_ID,
    title: '光反应：类囊体薄膜',
    order: 5,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas-slide-3',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#ffffff',
          themeColors: ['#5b9bd5', '#ed7d31'],
          fontColor: '#333333',
          fontName: 'Microsoft YaHei',
        },
        elements: [
          {
            id: 'txt_title3',
            type: 'text',
            left: 150,
            top: 40,
            width: 700,
            height: 80,
            rotate: 0,
            content: "<span style='font-size:44px;font-weight:bold'>光反应：类囊体薄膜</span>",
            defaultColor: '#1a5276',
            defaultFontName: 'Microsoft YaHei',
          },
          {
            id: 'img_chloro',
            type: 'image',
            left: 60,
            top: 180,
            width: 340,
            height: 240,
            rotate: 0,
            fixedRatio: true,
            src: chloroplastSvgDataUri,
          },
          {
            id: 'shape_thylakoid',
            type: 'shape',
            left: 860,
            top: 200,
            width: 90,
            height: 90,
            rotate: 0,
            viewBox: [1000, 1000],
            path: 'M500 0 A500 500 0 1 1 499 0 Z',
            fixedRatio: true,
            fill: '#66bb6a',
          },
          {
            id: 'txt_light_rxn',
            type: 'text',
            left: 140,
            top: 330,
            width: 640,
            height: 170,
            rotate: 0,
            content:
              "<div style='font-size:24px;line-height:1.7'>" +
              '水的光解：H₂O → O₂ + H⁺ + e⁻<br/>' +
              'ATP 合成：ADP + Pi → ATP<br/>' +
              'NADP⁺ 还原：NADP⁺ + H⁺ → NADPH</div>',
            defaultColor: '#333333',
            defaultFontName: 'Microsoft YaHei',
          },
          {
            id: 'line_water',
            type: 'line',
            left: 0,
            top: 0,
            width: 3,
            start: [430, 340],
            end: [780, 430],
            style: 'solid',
            color: '#1a5276',
            points: ['', 'arrow'],
          },
        ],
      },
    },
    actions: slide3Actions,
  },
  {
    id: 'scene-slide-4',
    stageId: MOCK_CLASSROOM_ID,
    title: '暗反应：叶绿体基质',
    order: 6,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas-slide-4',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#ffffff',
          themeColors: ['#5b9bd5', '#ed7d31'],
          fontColor: '#333333',
          fontName: 'Microsoft YaHei',
        },
        elements: [
          {
            id: 'txt_title4',
            type: 'text',
            left: 150,
            top: 40,
            width: 700,
            height: 80,
            rotate: 0,
            content: "<span style='font-size:44px;font-weight:bold'>暗反应：叶绿体基质</span>",
            defaultColor: '#1a5276',
            defaultFontName: 'Microsoft YaHei',
          },
          {
            id: 'img_stroma',
            type: 'image',
            left: 60,
            top: 170,
            width: 340,
            height: 240,
            rotate: 0,
            fixedRatio: true,
            src: stromaSvgDataUri,
          },
          {
            id: 'txt_dark_rxn',
            type: 'text',
            left: 440,
            top: 180,
            width: 520,
            height: 170,
            rotate: 0,
            content:
              "<div style='font-size:24px;line-height:1.7'>" +
              'CO₂ 固定：CO₂ + C₅ → 2C₃<br/>' +
              'C₃ 还原：C₃ + ATP + NADPH → C₃糖<br/>' +
              '产物：葡萄糖等有机物</div>',
            defaultColor: '#333333',
            defaultFontName: 'Microsoft YaHei',
          },
          {
            id: 'line_co2',
            type: 'line',
            left: 0,
            top: 0,
            width: 3,
            start: [420, 420],
            end: [520, 330],
            style: 'solid',
            color: '#1a5276',
            points: ['', 'arrow'],
          },
          {
            id: 'shape_circle4',
            type: 'shape',
            left: 860,
            top: 60,
            width: 80,
            height: 80,
            rotate: 0,
            viewBox: [1000, 1000],
            path: 'M500 0 A500 500 0 1 1 499 0 Z',
            fixedRatio: true,
            fill: '#ed7d31',
          },
        ],
      },
    },
    actions: slide4Actions,
  },
  {
    id: 'scene-quiz-2',
    stageId: MOCK_CLASSROOM_ID,
    title: '随堂测验（进阶）',
    order: 7,
    type: 'quiz',
    content: {
      type: 'quiz',
      questions: [
        {
          id: 'q4',
          type: 'single',
          question: '光合作用释放的氧气来自？',
          options: [
            { label: '二氧化碳', value: 'A' },
            { label: '水', value: 'B' },
            { label: '葡萄糖', value: 'C' },
          ],
          answer: ['B'],
        },
        {
          id: 'q5',
          type: 'multiple',
          question: '暗反应进行需要哪些物质？',
          options: [
            { label: 'ATP', value: 'A' },
            { label: 'NADPH', value: 'B' },
            { label: '光', value: 'C' },
          ],
          answer: ['A', 'B'],
        },
        {
          id: 'q6',
          type: 'single',
          question: '光反应发生的场所是？',
          options: [
            { label: '叶绿体基质', value: 'A' },
            { label: '类囊体薄膜', value: 'B' },
            { label: '叶绿体外膜', value: 'C' },
          ],
          answer: ['B'],
        },
        {
          id: 'q7',
          type: 'short_answer',
          question: '写出光合作用的总反应式。',
          answer: ['二氧化碳 + 水 → 有机物 + 氧气'],
        },
      ],
    },
    actions: quiz2Actions,
  },
  // {
  //   id: 'scene-interactive-2',
  //   stageId: MOCK_CLASSROOM_ID,
  //   title: '模拟实验：二氧化碳浓度对光合速率的影响',
  //   order: 8,
  //   type: 'interactive',
  //   content: {
  //     type: 'interactive',
  //     url: '',
  //     html:
  //       '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' +
  //       'body{font-family:sans-serif;padding:24px;background:#f1f8e9;color:#222}' +
  //       'h2{font-size:18px}.row{margin:18px 0}.label{font-size:14px;margin-bottom:6px}' +
  //       '</style></head><body>' +
  //       '<h2>CO₂ 浓度与光合速率</h2>' +
  //       '<div class="row"><div class="label">二氧化碳浓度：<span id="val">60</span></div>' +
  //       '<input id="co2" type="range" min="0" max="100" value="60" style="width:100%"></div>' +
  //       '<div class="row"><div class="label">当前光合速率：<span id="rate">68</span></div></div>' +
  //       '<script>' +
  //       'var input=document.getElementById("co2");' +
  //       'function update(){var v=+input.value;document.getElementById("val").textContent=v;' +
  //       'document.getElementById("rate").textContent=Math.round(v*0.8+20);}' +
  //       'input.addEventListener("input",update);update();' +
  //       '</script></body></html>',
  //     widgetType: 'simulation',
  //     widgetConfig: {
  //       type: 'simulation',
  //       concept: '二氧化碳浓度',
  //       variables: [{ name: 'co2', label: '二氧化碳浓度', min: 0, max: 100, default: 60 }],
  //     },
  //   },
  //   actions: interactive2Actions,
  // },
]

/** 首页课堂列表（供 HomePage 展示入口） */
export interface MockClassroomSummary {
  id: string
  name: string
  description: string
  scenesCount: number
}

/** mock 课堂列表（目前仅一份示例课程） */
export const mockClassroomsSummary: MockClassroomSummary[] = [
  {
    id: MOCK_CLASSROOM_ID,
    name: mockClassroomStage.name,
    description: mockClassroomStage.description ?? '',
    scenesCount: mockClassroomScenes.length,
  },
]
