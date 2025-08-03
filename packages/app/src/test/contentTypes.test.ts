import { ContentType, isTextMessage, isImageMessage } from '../hooks/useReverySession'

describe('Content Type Utilities', () => {
  describe('isTextMessage', () => {
    it('returns true for text content type', () => {
      expect(isTextMessage(ContentType.Text)).toBe(true)
    })

    it('returns false for image content type', () => {
      expect(isTextMessage(ContentType.Image)).toBe(false)
    })
  })

  describe('isImageMessage', () => {
    it('returns true for image content type', () => {
      expect(isImageMessage(ContentType.Image)).toBe(true)
    })

    it('returns false for text content type', () => {
      expect(isImageMessage(ContentType.Text)).toBe(false)
    })
  })

  describe('ContentType enum', () => {
    it('has correct numeric values', () => {
      expect(ContentType.Text).toBe(0)
      expect(ContentType.Image).toBe(1)
    })
  })
})