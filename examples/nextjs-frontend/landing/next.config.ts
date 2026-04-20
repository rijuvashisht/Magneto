import type { NextConfig } from "next";
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [['rehype-pretty-code', {
      theme: 'github-dark',
      keepBackground: false,
    }]],
  },
});

export default withMDX(nextConfig);
