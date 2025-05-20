/**
 * Wait for a specified number of milliseconds
 * @param milliseconds Number of milliseconds to wait
 * @returns Promise object
 */
export async function wait(milliseconds: number): Promise<string> {
  if (isNaN(milliseconds)) {
    throw new Error('milliseconds is not a number')
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve('done!'), milliseconds)
  })
}
