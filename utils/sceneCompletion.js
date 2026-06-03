/**
 * This module provides a function to retrieve completion data for the scenes.
 * It gathers the keys from localStorage and returns them as a JSON string.
 */

export function getCompletionData() {
    let object = Object.keys(localStorage)
    return object
}