package dynamicresources

import "k8s.io/apimachinery/pkg/runtime/schema"

var GatewayGVR = schema.GroupVersionResource{
	Group:    "gateway.networking.k8s.io",
	Version:  "v1",
	Resource: "gateways",
}
