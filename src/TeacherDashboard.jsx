// src/TeacherDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

/**
  This dashboard expects result docs with at least:
  { firstName, lastName, level, scores: { Linguistique: 7, ... }, createdAt }
*/

// canonical order of intelligence keys (your stored keys are in French)
const INTELLIGENCE_KEYS = [
  "Linguistic",
  "Logical-Mathematical",
  "Spatial",
  "Kinesthetic",
  "Musical",
  "Interpersonal",
  "Intrapersonal",
  "Naturalistic"
];

// map keys to English labels shown in the dashboard
// (can be the same as the DB keys if you don’t need pretty labels)
const LABELS = {
  "Linguistic": "Linguistic",
  "Logical-Mathematical": "Logical/Math",
  "Spatial": "Spatial",
  "Kinesthetic": "Kinesthetic",
  "Musical": "Musical",
  "Interpersonal": "Interpersonal",
  "Intrapersonal": "Intrapersonal",
  "Naturalistic": "Naturalistic"
};

// maximum possible score per intelligence (3 questions * 3pts = 9)
// you can change this if you modify questions
const MAX_SCORE = 9;

function normalizeDoc(doc) {
  const data = { id: doc.id, ...doc.data() };
  if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate();
  return data;
}

function topIntelligences(scores, n = 3) {
  if (!scores) return [];
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => LABELS[k] || k);
}

function levelToGrade(level) {
  if (!level) return "Unknown";
  if (level === "level1") return "Grade 9";
  if (level === "level2") return "Grade 10";
  if (level === "level3") return "Grade 11";
  if (level === "level4") return "Grade 12";
  return level;
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const docs = snap.docs.map(normalizeDoc);
        if (!mounted) return;
        setResults(docs);
      } catch (err) {
        console.error("Failed to load results:", err);
        if (!mounted) return;
        setResults([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Build a map: level -> name -> latestDoc
  const latestPerStudent = useMemo(() => {
    const map = {};
    results.forEach(r => {
      const lvl = r.level || "unknown";
      const name = `${r.firstName || ""} ${r.lastName || ""}`.trim() || "(no name)";
      map[lvl] = map[lvl] || {};
      if (!map[lvl][name]) {
        map[lvl][name] = r;
      } else {
        // keep the most recent by createdAt
        const prev = map[lvl][name];
        const prevTime = prev.createdAt ? +new Date(prev.createdAt) : 0;
        const curTime = r.createdAt ? +new Date(r.createdAt) : 0;
        if (curTime > prevTime) map[lvl][name] = r;
      }
    });
    return map;
  }, [results]);

  // Flatten into visible list and apply filters
  const visible = useMemo(() => {
    const arr = [];
    const levels = Object.keys(latestPerStudent).length ? Object.keys(latestPerStudent) : ["level1","level2","level3","level4"];
    levels.forEach(lvl => {
      if (levelFilter !== "all" && lvl !== levelFilter) return;
      const students = latestPerStudent[lvl] || {};
      Object.keys(students).forEach(name => {
        if (search && !name.toLowerCase().includes(search.toLowerCase())) return;
        arr.push({
          level: lvl,
          name,
          doc: students[name]
        });
      });
    });
    // sort by name alphabetically
    arr.sort((a,b) => a.name.localeCompare(b.name));
    return arr;
  }, [latestPerStudent, levelFilter, search]);

  return (
    <div className="td-root">
      <header className="td-header">
        <h1>Teacher Dashboard</h1>
        <div className="td-controls">
          <label>
            Grade:
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="all">All Grades</option>
              <option value="level1">Grade 9</option>
              <option value="level2">Grade 10</option>
              <option value="level3">Grade 11</option>
              <option value="level4">Grade 12</option>
            </select>
          </label>

          <label>
            Search:
            <input placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)} />
          </label>

          <div className="td-count">{loading ? "Loading..." : `${visible.length} students`}</div>
        </div>
      </header>

      <main>
        <div className="td-grid">
          {visible.map(item => {
            const s = item.doc || {};
            const scores = s.scores || {};
            const top = topIntelligences(scores, 3);
            return (
              <div key={`${item.level}-${item.name}`} className="td-card">
                <div className="td-card-header">
                  <div className="td-name">{item.name}</div>
                  <div className="td-grade">{levelToGrade(item.level)}</div>
                </div>

                <div className="td-top">
                  <strong>Top:</strong> {top.length ? top.join(" • ") : "—"}
                </div>

                <div className="td-bar-chart" aria-hidden>
                  {INTELLIGENCE_KEYS.map(key => {
                    const val = typeof scores[key] === "number" ? scores[key] : 0;
                    const pct = Math.round((val / MAX_SCORE) * 100);
                    return (
                      <div key={key} className="td-bar-row">
                        <div className="td-bar-label">{LABELS[key] || key}</div>
                        <div className="td-bar-outer">
                          <div className="td-bar-inner" style={{ width: `${pct}%` }}>
                            <span className="td-bar-value">{val}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {(!loading && visible.length === 0) && (
            <div style={{ gridColumn: "1/-1", color: "#555" }}>No students found for the selected filters.</div>
          )}
        </div>
      </main>
    </div>
  );
}
