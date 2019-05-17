// @flow
const toPath = (key: string): string[] => {
  if (key === null || key === undefined || !key.length) {
    return []
  }
  if (typeof key !== 'string') {
    throw new Error('toPath() expects a string')
  }
  return key.match(/[^[\].]+/g) || []
}

export default toPath
