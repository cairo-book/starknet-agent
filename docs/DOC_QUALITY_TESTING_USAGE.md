# Documentation Quality Testing Usage Guide

This guide explains how to use the Documentation Quality Testing feature to evaluate and improve the quality of documentation integrated into the Starknet Agent.

## Overview

The Documentation Quality Testing feature allows documentation teams to:

1. Test how well their documentation performs with the Starknet Agent
2. Receive actionable recommendations for improvement
3. Track quality metrics over time
4. Compare results between different versions

## Quick Start

### Prerequisites

- Starknet Agent repository cloned and set up
- Node.js and pnpm installed
- API keys for Anthropic and OpenAI configured in `config.toml`
- MongoDB Atlas instance with vector search configured

### Running a Documentation Quality Test

1. Create a test set JSON file (or use the provided sample in `packages/agents/src/tests/samples/starknet_docs_quality.json`)
2. Run the test command:

```bash
pnpm --filter @starknet-agent/agents test-doc-quality test \
  --source starknet_docs \
  --test-file ./src/tests/samples/starknet_docs_quality.json \
  --output ./results/starknet_docs_quality_results.json
```

3. Review the generated results and recommendations

## Creating Test Sets

Test sets are defined in JSON format with the following structure:

```json
{
  "source": "starknet_docs",
  "version": "1.0.0",
  "metadata": {
    "owner": "starknet-team",
    "repository": "starknet-docs"
  },
  "testCases": [
    {
      "query": "How do I deploy a smart contract on Starknet?",
      "expectedTopics": ["deploy", "contract", "declare", "starknet_cli"],
      "type": "procedural",
      "difficulty": "basic",
      "tags": ["deployment", "contracts", "basics"]
    },
    ...
  ]
}
```

### Test Case Properties

- `query`: The question to test against the documentation
- `expectedTopics`: Key topics that should be covered in the answer
- `groundTruth` (optional): Reference answer for evaluating factual accuracy
- `type`: Type of query - "factual", "procedural", or "conceptual"
- `difficulty`: Difficulty level - "basic", "intermediate", or "advanced"
- `tags`: Custom tags for categorization

## Understanding Results

The test results include:

1. **Overall Metrics**:

   - Relevance Score: How relevant are the retrieved documents?
   - Coverage Score: What percentage of expected topics are covered?
   - Precision@K: Proportion of relevant documents among top retrieved
   - Answer Completeness: How complete are the generated answers?

2. **Breakdowns by Category**:

   - By query type (factual, procedural, conceptual)
   - By difficulty level
   - By custom tags

3. **Recommendations**:
   - Content-specific improvements
   - Structural recommendations
   - Terminology clarifications
   - Example suggestions

## Comparing Documentation Versions

After implementing improvements, you can compare results between versions:

```bash
pnpm --filter @starknet-agent/agents test-doc-quality compare \
  --source starknet_docs \
  --baseline ./results/starknet_docs_v1.0.0_results.json \
  --current ./results/starknet_docs_v1.1.0_results.json \
  --output ./results/starknet_docs_comparison.json
```

The comparison report highlights:

- Improvements in metrics
- Regressions that need attention
- Specific recommendations to address any issues

## Best Practices

1. **Test Case Design**:

   - Include questions that cover all important aspects of your documentation
   - Ensure a mix of query types, difficulties, and topics
   - Specify expected topics carefully for accurate evaluation

2. **Documentation Improvement**:

   - Focus on high-priority recommendations first
   - Address structural issues before content-specific issues
   - Test incrementally after making significant changes

3. **Metadata Management**:
   - Use consistent version numbering
   - Document test set changes
   - Keep previous test results for historical comparison

## Command Line Options

### Test Command

```
test-doc-quality test [options]

Options:
  -s, --source <source>        Documentation source to test (required)
  -t, --test-file <file>       Path to test file (JSON) (required)
  -o, --output <file>          Path to output file (JSON)
  -m, --model <model>          LLM model to use for testing (default: "Claude 3.5 Sonnet")
  -e, --eval-model <model>     LLM model to use for evaluation
```

### Compare Command

```
test-doc-quality compare [options]

Options:
  -s, --source <source>        Documentation source to test (required)
  -b, --baseline <file>        Path to baseline results file (JSON) (required)
  -c, --current <file>         Path to current results file (JSON) (required)
  -o, --output <file>          Path to output file (JSON)
  -m, --model <model>          LLM model to use for comparison (default: "Claude 3.5 Sonnet")
```

## Next Steps

1. Create custom test sets for your specific documentation
2. Run initial quality tests to establish a baseline
3. Implement the recommended improvements
4. Run follow-up tests to measure progress
5. Repeat the process iteratively to continuously improve documentation quality

By following this process, documentation teams can systematically improve the quality and effectiveness of their documentation for AI-driven interactions.
