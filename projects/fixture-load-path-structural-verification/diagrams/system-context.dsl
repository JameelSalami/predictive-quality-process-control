workspace "Fixture Load-Path Verification: Hand Calculations, FEA, and Physical Evidence" {
  model {
    user = person "Engineer" "Frames the problem and chooses tradeoffs."
    system = softwareSystem "Case Study System" "Analyzes Design-to-manufacturing optimization using public/synthetic data."
    source = softwareSystem "Public / Synthetic Sources" "Evidence and generated data."
    verifier = softwareSystem "Independent Verification" "Tests, statistics, solver evidence, or observed outcomes."
    user -> system "Investigates"
    source -> system "Supplies evidence"
    system -> verifier "Produces claims to verify"
    verifier -> user "Returns evidence"
  }
  views {
    systemContext system "SystemContext" {
      include *
      autolayout lr
    }
  }
}
