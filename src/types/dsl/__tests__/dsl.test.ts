/**
 * 文件头：自建类型模块（@openmaic/dsl 别名）冒烟测试
 *
 * 对应原项目：packages/@openmaic/dsl/test/*.test.ts（DSL 包的 vitest 测试）
 *
 * 功能：
 *   1. 验证 alias 链路可用（测试里 `import '@openmaic/dsl'` 能解析到 src/types/dsl/）；
 *   2. 验证裁剪后的场景类型 / 动作常量符合需求；
 *   3. 验证运行时守卫（isSlideContent / isQuizContent）行为正确。
 */
import { describe, it, expect } from 'vitest'
import {
  FIRE_AND_FORGET_ACTIONS,
  SLIDE_ONLY_ACTIONS,
  isSlideContent,
  isQuizContent,
  SCENE_TYPES,
} from '@openmaic/dsl'
import type { Scene } from '../stage'

describe('自建类型模块（@openmaic/dsl 别名解析）', () => {
  it('SCENE_TYPES 仅包含裁剪范围内的三种场景', () => {
    expect(SCENE_TYPES).toEqual(['slide', 'quiz', 'interactive'])
  })

  it('FIRE_AND_FORGET_ACTIONS / SLIDE_ONLY_ACTIONS 包含 spotlight（需求保留的聚光）', () => {
    expect(FIRE_AND_FORGET_ACTIONS).toContain('spotlight')
    expect(SLIDE_ONLY_ACTIONS).toContain('spotlight')
  })

  it('构造 slide 场景并通过 isSlideContent 守卫', () => {
    const slideScene: Scene = {
      id: 'sc1',
      stageId: 's1',
      title: '什么是光合作用',
      order: 1,
      type: 'slide',
      content: {
        type: 'slide',
        canvas: {
          id: 'c1',
          viewportSize: 1000,
          viewportRatio: 0.5625,
          theme: {
            backgroundColor: '#ffffff',
            themeColors: [],
            fontColor: '#333333',
            fontName: 'Microsoft YaHei',
          },
          elements: [],
        },
      },
      actions: [
        { id: 'a1', type: 'speech', text: '同学们好，今天学习光合作用。' },
        { id: 'a2', type: 'spotlight', elementId: 'img_1', dimOpacity: 0.5 },
      ],
    }
    // 守卫收窄成功：内容确认为 SlideContent
    expect(isSlideContent(slideScene.content)).toBe(true)
  })

  it('构造 quiz 场景并通过 isQuizContent 守卫', () => {
    const quizScene: Scene = {
      id: 'sc2',
      stageId: 's1',
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
            options: [{ label: '叶绿体', value: 'A' }],
            answer: ['A'],
            points: 1,
          },
        ],
      },
    }
    expect(isQuizContent(quizScene.content)).toBe(true)
  })
})
