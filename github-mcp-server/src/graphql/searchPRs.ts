export const SEARCH_PR_QUERY = `
  query SearchPRs($query: String!, $limit: Int!, $after: String) {
    search(query: $query, type: ISSUE, first: $limit, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          number
          title
          url
          state
          createdAt
          updatedAt
          author { login }
        }
      }
    }
  }
`;
