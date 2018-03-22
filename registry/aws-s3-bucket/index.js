/* eslint-disable no-console */

const AWS = require('aws-sdk')

const S3 = new AWS.S3({ region: 'us-east-1' })

const createBucket = async ({ name }) => S3.createBucket({ Bucket: name }).promise()

const deleteBucket = async ({ name }) => {
  const res = await S3.listObjectsV2({ Bucket: name }).promise()

  const objectsInBucket = []
  if (res) {
    res.Contents.forEach((object) => {
      objectsInBucket.push({
        Key: object.Key
      })
    })
  }

  if (objectsInBucket.length) {
    await S3.deleteObjects({
      Bucket: name,
      Delete: {
        Objects: objectsInBucket
      }
    }).promise()
  }

  return S3.deleteBucket({ Bucket: name }).promise()
}

const deploy = async (inputs, context) => {
  const { state } = context
  const hasNameState = state.name

  // Postfix bucketname
  if (!hasNameState && inputs.forceUniqueBucketName) {
    const hrtime = process.hrtime()
    const postFix = `${hrtime[0]}x${hrtime[1]}`
    context.log(`Setting bucketName postFix value '${inputs.name}-${postFix}'`)
    inputs.name = `${inputs.name}-${postFix}`
  }

  if (!hasNameState && inputs.name) {
    context.log(`Creating Bucket: '${inputs.name}'`)
    await createBucket(inputs)
  } else if (!inputs.name && state.name) {
    context.log(`Removing Bucket: '${state.name}'`)
    await deleteBucket(state)
  } else if (state.name !== inputs.name) {
    context.log(`Removing Bucket: '${state.name}'`)
    await deleteBucket(state)
    context.log(`Creating Bucket: '${inputs.name}'`)
    await createBucket(inputs)
  }
  const outputs = {
    name: inputs.name
  }
  context.saveState({ ...inputs, ...outputs })
  return outputs
}

const rollback = async (inputs, context) => {
  const { archive, state } = context
  if (!archive.name && state.name) {
    context.log(`Removing Bucket: ${state.name}`)
    await deleteBucket(state)
  } else if (archive.name && !state.name) {
    context.log(`Creating Bucket: ${archive.name}`)
    await createBucket(archive)
  } else if (archive.name !== state.name) {
    context.log(`Removing Bucket: ${state.name}`)
    await deleteBucket(state)
    context.log(`Creating Bucket: ${archive.name}`)
    await createBucket(archive)
  }
  return archive
}

const remove = async (inputs, context) => {
  if (!context.state.name) return {}

  context.log(`Removing Bucket: '${context.state.name}'`)
  await deleteBucket(context.state)
  context.saveState({})
  return {
    name: null
  }
}

module.exports = {
  deploy,
  remove,
  rollback
}
