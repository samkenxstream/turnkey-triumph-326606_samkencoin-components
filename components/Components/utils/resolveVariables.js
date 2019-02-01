const { forEach, reduce, union } = require('@serverless/utils')

function resolveVariables(content) {
  const stringified = JSON.stringify(content)
  const variablesRegex = /\${([\w\d.]+)}/g

  let match
  let matches = []
  while ((match = variablesRegex.exec(stringified))) {
    const variableValue = match[1]
    // using `union` here to filter out duplicates
    matches = union([variableValue], matches)
  }

  let populated = stringified
  forEach((match) => {
    // eslint-disable-line
    const parts = match.split('.')
    const resolvedValue = reduce((accum, key) => accum[key], content, parts)
    const variableRegex = new RegExp('\\${' + match + '}', 'g')
    populated = populated.replace(variableRegex, resolvedValue)
  }, matches)

  return JSON.parse(populated)
}

module.exports = resolveVariables
