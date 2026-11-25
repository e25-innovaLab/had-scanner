class AnalysisCancelledException(Exception):
    """Raised when an analysis has been cancelled."""


class ProposalCancelledException(Exception):
    """Raised when an in-flight proposal generation was cancelled."""