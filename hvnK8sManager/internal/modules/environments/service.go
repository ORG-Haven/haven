package environments

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type Service struct {
	client *kubernetes.Clientset
}

func NewService() (*Service, error) {
	config, err := loadConfig()
	if err != nil {
		return nil, err
	}
	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return &Service{client: client}, nil
}

// loadConfig uses the pod's service account when running in a cluster, and falls back to the
// local kubeconfig ($KUBECONFIG or ~/.kube/config, current context) for local development.
func loadConfig() (*rest.Config, error) {
	config, err := rest.InClusterConfig()
	if err == nil {
		slog.Info("using in-cluster kubernetes config")
		return config, nil
	}
	if !errors.Is(err, rest.ErrNotInCluster) {
		return nil, err
	}

	config, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		clientcmd.NewDefaultClientConfigLoadingRules(),
		&clientcmd.ConfigOverrides{},
	).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("not in a cluster and no usable kubeconfig: %w", err)
	}
	slog.Info("using local kubeconfig", "host", config.Host)
	return config, nil
}

func (s *Service) List(ctx context.Context) ([]Environment, error) {
	result, err := s.client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return []Environment{}, err
	}
	environments := []Environment{}
	for _, namespace := range result.Items {
		environments = append(environments, Environment{Name: namespace.Name})
	}
	return environments, nil
}
