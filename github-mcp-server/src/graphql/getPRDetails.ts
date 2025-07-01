export const GET_PR_DETAILS = `
  query GetPRDetails($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        number
        title
        body
        url
        state
        locked
        createdAt
        updatedAt
        closedAt
        mergedAt
        merged
        mergeable
        mergeStateStatus
        comments { totalCount }
        reviewThreads { totalCount }
        assignees(first: 10) { nodes { login } }
        author { login }
        reviewRequests(first: 10) {
          nodes { requestedReviewer { ... on User { login } } }
        }
        commits(last: 1) {
          totalCount
          nodes {
            commit {
              oid
              message
            }
          }
        }
        additions
        deletions
        changedFiles
        baseRefName
        headRefName
        mergedBy { login }
      }
    }
  }
`;
