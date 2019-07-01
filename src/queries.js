export const listReports = `query listReports {
  listReports {
    items {
      id
      comment
      talkTitle
      commentId
      deviceId
    }
  }
}`