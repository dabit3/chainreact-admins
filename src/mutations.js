export const deleteComment = `mutation deleteComment($id: ID) {
  deleteComment(input: {
    id: $id
  }) {
    id
    talkId
    text
  }
}`

export const deleteReport = `mutation deleteReport($id: ID!) {
  deleteReport(input: {
    id: $id
  }) {
    id
  }
}`

export const createBannedId = `mutation createBannedId($id: ID!) {
  createBannedId(isBanned: true id:$id) {
    id
  }
}`