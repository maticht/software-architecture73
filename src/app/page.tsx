import { CourseDashboard } from "@/components/course-dashboard";
import { getCourse } from "@/lib/course";

export default function Home() {
  return <CourseDashboard chapters={getCourse()} />;
}
