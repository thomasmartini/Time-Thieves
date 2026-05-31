export function getCompletionData() {
    let object = Object.keys(sessionStorage)
    return JSON.stringify(object)
}