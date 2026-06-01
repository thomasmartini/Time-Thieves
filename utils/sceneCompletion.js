/**
 * This module provides a function to retrieve completion data for the scenes.
 * It gathers the keys from sessionStorage and returns them as a JavaScript object.
 */

export function getCompletionData() {
    let object = Object.keys(sessionStorage)
    return object
}