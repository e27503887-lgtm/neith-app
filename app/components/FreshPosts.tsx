"use client";

import { useEffect, useState } from "react";
import PostCard from "./PostCard";
import { POST_CREATED_EVENT, type CreatedPost } from "../utils/composeEvents";

// Renders posts created in this session (via the compose modal) at the top of
// the server-rendered feed, without a page reload.
export default function FreshPosts() {
  const [posts, setPosts] = useState<CreatedPost[]>([]);

  useEffect(() => {
    function handleCreated(e: Event) {
      const post = (e as CustomEvent<CreatedPost>).detail;
      if (!post) return;
      setPosts((prev) => [post, ...prev]);
    }

    window.addEventListener(POST_CREATED_EVENT, handleCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, handleCreated);
  }, []);

  if (posts.length === 0) return null;

  return (
    <>
      {posts.map((post) => (
        <PostCard key={`fresh-${post.id}`} post={post} />
      ))}
    </>
  );
}
