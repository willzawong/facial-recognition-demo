import * as faceapi from 'face-api.js'

export async function loadModels() {
  const MODEL_URL = '/models'

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ])
}

export async function detectFaces(video: HTMLVideoElement) {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320, // try 416 later if this is too blurry
    scoreThreshold: 0.4, // lower = more sensitive
  })

  return faceapi
    .detectAllFaces(video, options)
    .withAgeAndGender()
    .withFaceExpressions()
}
