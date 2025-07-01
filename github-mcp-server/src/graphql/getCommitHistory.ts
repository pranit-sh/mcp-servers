export const GET_COMMIT_HISTORY = `
  query GetCommitHistory($owner: String!, $name: String!, $branch: String!, $limit: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      ref(qualifiedName: $branch) {
        target {
          ... on Commit {
            history(first: $limit, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                messageHeadline
                messageBody
                committedDate
                author {
                  name
                  email
                  user {
                    login
                  }
                }
                changedFiles
                additions
                deletions
                url
              }
            }
          }
        }
      }
    }
  }

`;
