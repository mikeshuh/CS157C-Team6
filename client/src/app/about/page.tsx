"use client";

import React from 'react';
import Link from 'next/link';

export default function About() {
  return (
    <main className="bg-gray-50 min-h-screen pb-12">
      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 py-6 mb-6">
        <div className="container mx-auto px-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-serif font-bold">About Briefly</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm p-6 md:p-8">
          <section className="mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">Our Mission</h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              Briefly is a modern news aggregator built to help you stay informed without being overwhelmed. 
              We understand that keeping up with the news can be time-consuming and sometimes stressful, 
              which is why we've created a platform that delivers concise, AI-powered summaries of the most 
              important stories from around the web.
            </p>
            <p className="text-gray-800 leading-relaxed">
              Our goal is to empower you with knowledge, saving you time while ensuring you don't miss 
              out on what matters most. Whether you're interested in world news, technology, business, 
              or entertainment, Briefly curates and summarizes the latest developments so you can quickly 
              grasp the essential information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-3xl font-serif font-bold text-gray-300 mb-2">01</div>
                <h3 className="text-xl font-serif font-bold mb-2">Article Collection</h3>
                <p className="text-gray-700">
                  We gather articles from trusted sources across the internet, covering a wide range of topics and categories.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-3xl font-serif font-bold text-gray-300 mb-2">02</div>
                <h3 className="text-xl font-serif font-bold mb-2">AI Summarization</h3>
                <p className="text-gray-700">
                  Our advanced AI technology analyzes each article, extracting the key points and generating concise summaries.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-3xl font-serif font-bold text-gray-300 mb-2">03</div>
                <h3 className="text-xl font-serif font-bold mb-2">Personalized Delivery</h3>
                <p className="text-gray-700">
                  Browse articles by category or create an account to customize your news feed based on your interests.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-serif font-bold mb-4">Our Values</h2>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-3 mt-1 text-gray-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <strong className="font-serif">Accessibility:</strong> Making quality news accessible to everyone, regardless of how much time they have.
                </div>
              </li>
              <li className="flex">
                <div className="mr-3 mt-1 text-gray-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <strong className="font-serif">Transparency:</strong> We always link to original sources and never hide information.
                </div>
              </li>
              <li className="flex">
                <div className="mr-3 mt-1 text-gray-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <strong className="font-serif">Balance:</strong> We strive to present diverse perspectives across the political spectrum.
                </div>
              </li>
              <li className="flex">
                <div className="mr-3 mt-1 text-gray-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <strong className="font-serif">Innovation:</strong> We continuously improve our technology to provide the best possible experience.
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Get Started</h2>
            <p className="text-gray-800 leading-relaxed mb-6">
              Ready to transform your news reading experience? Create an account today to unlock personalized 
              features and stay informed with Briefly.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="/signup" 
                className="bg-gray-900 text-white px-6 py-3 rounded font-serif hover:bg-gray-800 transition"
              >
                Sign Up Now
              </Link>
              <Link 
                href="/" 
                className="border border-gray-900 text-gray-900 px-6 py-3 rounded font-serif hover:bg-gray-100 transition"
              >
                Browse News
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-serif font-black tracking-tight">BRIEFLY</h3>
          </div>
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2025 Briefly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}