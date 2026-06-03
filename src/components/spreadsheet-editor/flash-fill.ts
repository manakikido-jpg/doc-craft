/**
 * Flash Fill — detect patterns from input/output examples and apply them.
 * Supports: substring extraction, case transforms, number extraction, string combination.
 */

export interface FlashFillExample {
  input: string
  output: string
}

type TransformFn = (input: string) => string | null

/**
 * Detect a flash fill pattern from examples and return a transform function.
 * Returns null if no pattern can be detected.
 */
export function detectFlashFillPattern(
  examples: FlashFillExample[]
): TransformFn | null {
  if (examples.length === 0) return null

  // Try each strategy in order
  const strategies: (() => TransformFn | null)[] = [
    () => trySubstringExtract(examples),
    () => tryCaseTransform(examples),
    () => tryNumberExtract(examples),
    () => tryPrefixSuffix(examples),
    () => trySplitAndPick(examples),
  ]

  for (const strategy of strategies) {
    const fn = strategy()
    if (fn) {
      // Verify it works on all examples
      const allMatch = examples.every((ex) => fn(ex.input) === ex.output)
      if (allMatch) return fn
    }
  }

  return null
}

/** Try fixed-position substring extraction */
function trySubstringExtract(examples: FlashFillExample[]): TransformFn | null {
  const first = examples[0]
  const start = first.input.indexOf(first.output)
  if (start >= 0) {
    const len = first.output.length
    const fn: TransformFn = (input) => {
      if (input.length >= start + len) {
        return input.substring(start, start + len)
      }
      return null
    }
    if (examples.every((ex) => fn(ex.input) === ex.output)) return fn
  }

  // Try from end
  const fromEnd = first.input.length - (first.input.lastIndexOf(first.output) + first.output.length)
  if (first.input.lastIndexOf(first.output) >= 0) {
    const len = first.output.length
    const fn: TransformFn = (input) => {
      const s = input.length - fromEnd - len
      if (s >= 0) return input.substring(s, s + len)
      return null
    }
    if (examples.every((ex) => fn(ex.input) === ex.output)) return fn
  }

  return null
}

/** Try case transforms: upper, lower, capitalize */
function tryCaseTransform(examples: FlashFillExample[]): TransformFn | null {
  // All uppercase
  if (examples.every((ex) => ex.output === ex.input.toUpperCase())) {
    return (input) => input.toUpperCase()
  }

  // All lowercase
  if (examples.every((ex) => ex.output === ex.input.toLowerCase())) {
    return (input) => input.toLowerCase()
  }

  // Title case (capitalize first letter of each word)
  const titleCase = (s: string) =>
    s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase())
  if (examples.every((ex) => ex.output === titleCase(ex.input))) {
    return titleCase
  }

  // Capitalize first only
  const capFirst = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  if (examples.every((ex) => ex.output === capFirst(ex.input))) {
    return capFirst
  }

  return null
}

/** Extract numbers from input */
function tryNumberExtract(examples: FlashFillExample[]): TransformFn | null {
  // Extract all digits
  if (examples.every((ex) => ex.output === ex.input.replace(/\D/g, ''))) {
    return (input) => input.replace(/\D/g, '') || null
  }

  // Extract first number
  if (
    examples.every((ex) => {
      const m = ex.input.match(/\d+/)
      return m && m[0] === ex.output
    })
  ) {
    return (input) => {
      const m = input.match(/\d+/)
      return m ? m[0] : null
    }
  }

  return null
}

/** Try adding prefix/suffix */
function tryPrefixSuffix(examples: FlashFillExample[]): TransformFn | null {
  const first = examples[0]
  const idx = first.output.indexOf(first.input)
  if (idx >= 0) {
    const prefix = first.output.substring(0, idx)
    const suffix = first.output.substring(idx + first.input.length)
    const fn: TransformFn = (input) => `${prefix}${input}${suffix}`
    if (examples.every((ex) => fn(ex.input) === ex.output)) return fn
  }
  return null
}

/** Try splitting by delimiter and picking a part */
function trySplitAndPick(examples: FlashFillExample[]): TransformFn | null {
  const delimiters = [',', ' ', '-', '_', '/', '.', ';', '\t', '|']

  for (const delim of delimiters) {
    const first = examples[0]
    const parts = first.input.split(delim)
    if (parts.length < 2) continue

    // Check if output matches one part
    for (let i = 0; i < parts.length; i++) {
      const trimmed = parts[i].trim()
      if (trimmed === first.output) {
        const fn: TransformFn = (input) => {
          const p = input.split(delim)
          return p[i] !== undefined ? p[i].trim() : null
        }
        if (examples.every((ex) => fn(ex.input) === ex.output)) return fn
      }
    }

    // Check if output is reversed parts joined with a different delimiter
    for (const joinDelim of delimiters) {
      if (joinDelim === delim) continue
      // Try reversed join
      const reversed = parts.map((p) => p.trim()).reverse().join(joinDelim)
      if (reversed === first.output) {
        const fn: TransformFn = (input) => {
          const p = input.split(delim).map((s) => s.trim())
          return p.reverse().join(joinDelim)
        }
        if (examples.every((ex) => fn(ex.input) === ex.output)) return fn
      }
    }
  }

  return null
}
