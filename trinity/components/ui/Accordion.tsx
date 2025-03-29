"use client";

import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4">
            <button
                className="flex justify-between items-center w-full px-6 py-4 text-lg font-semibold text-gray-900 border-b border-gray-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                {title}
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {isOpen && <div className="p-6">{children}</div>}
        </div>
    );
}
