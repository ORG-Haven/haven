package environments

type Environment struct {
	Name   string            `json:"name"`
	Labels map[string]string `json:"labels"`
}
