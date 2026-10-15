import { EMBEDDING_DIMENSIONS, type EmbeddingService } from '@/domain/embeddings/embedding-service'

function seedOf(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return vector.map((value) => value / norm)
}

export function deterministicVector(text: string): number[] {
  let state = seedOf(text)
  const vector: number[] = []
  for (let index = 0; index < EMBEDDING_DIMENSIONS; index += 1) {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    vector.push(((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296 - 0.5)
  }
  return normalize(vector)
}

export function blendVectors(primary: number[], secondary: number[], primaryWeight: number): number[] {
  const secondaryWeight = Math.sqrt(1 - primaryWeight * primaryWeight)
  return normalize(primary.map((value, index) => primaryWeight * value + secondaryWeight * secondary[index]!))
}

export class DeterministicTestEmbeddingService implements EmbeddingService {
  readonly calls: string[] = []

  async embed(text: string): Promise<number[]> {
    this.calls.push(text)
    return deterministicVector(text)
  }
}
