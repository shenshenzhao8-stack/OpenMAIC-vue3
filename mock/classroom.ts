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
import type { Scene, Stage } from '@/types/stage'
import type { Action } from '@/types/action'

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
