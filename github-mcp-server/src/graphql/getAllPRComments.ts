export const GET_ALL_PR_COMMENTS = `
  query GetAllPRComments($owner: String!, $name: String!, $number: Int!, $first: Int = 100) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviews(first: $first) {
          nodes {
            body
            author {
              login
            }
            state
            submittedAt
            commit {
              oid
            }
          }
        }

        reviewThreads(first: 50) {
          nodes {
            isResolved
            isOutdated
            comments(first: 10) {
              nodes {
                body
                diffHunk
                path
                createdAt
                author {
                  login
                }
                commit {
                  oid
                }
              }
            }
          }
        }

        commits(last: 1) {
          nodes {
            commit {
              oid
              committedDate
            }
          }
        }
      }

      issue(number: $number) {
        comments(first: $first) {
          nodes {
            body
            author {
              login
            }
            createdAt
          }
        }
      }
    }
  }
`;
