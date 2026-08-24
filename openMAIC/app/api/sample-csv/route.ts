/**
 * Sample CSV Download
 * GET /api/sample-csv
 * Returns a sample CSV file for instructors to use as a template
 */

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const csvContent = `question,timer_seconds,answer_a,answer_b,answer_c,answer_d,answer_e,correct_answer,explanation,source_link
"What is machine learning?",60,"A subset of AI","A type of database","A programming language","A statistical method","A cloud service",A,"Machine learning is a subset of artificial intelligence that enables systems to learn from data.",https://example.com/ml-intro
"What does API stand for?",45,"Application Programming Interface","Advanced Program Interface","Application Process Integration","Automated Programming Input","Application Protocol Item",A,"API stands for Application Programming Interface, which allows different software to communicate.",https://example.com/api-guide
"Which is NOT a cloud provider?",60,"AWS","Google Cloud","Microsoft Azure","LocalHost Cloud","IBM Cloud",D,"LocalHost Cloud is not a real cloud provider; the major providers are AWS, Azure, GCP, and IBM Cloud.",https://example.com/cloud-providers
"What is the primary purpose of version control?",75,"Track code changes","Compile code","Run tests","Delete old files","Optimize performance",A,"Version control tracks changes to code, enables collaboration, and provides history.",https://example.com/version-control
"Which HTTP method is used to retrieve data?",45,"GET","POST","PUT","DELETE","PATCH",A,"GET is the HTTP method used to retrieve data from a server.",https://example.com/http-methods`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample-quiz.csv"',
    },
  });
}
