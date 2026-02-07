import { OnboardingHeader } from "@/components/onboarding-header";
import { IcpAgentView } from "./view";

export default function IcpAgentPage() {
  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/icp/introduction" },
          { label: "ICP", href: "/onboarding/icp/icp-agent" },
          { label: "ICP Agent" },
        ]}
      />
      <IcpAgentView />
    </>
  );
}
